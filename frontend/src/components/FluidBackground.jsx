import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

export default function FluidBackground() {
  const canvasRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const { gl, ext } = getWebGLContext(canvas)

    let config = {
      SIM_RESOLUTION: 96,
      DYE_RESOLUTION: 720,
      DENSITY_DISSIPATION: 2.5,
      VELOCITY_DISSIPATION: 2,
      PRESSURE: 0.1,
      PRESSURE_ITERATIONS: 15,
      CURL: 2,
      SPLAT_RADIUS: 0.2,
      SPLAT_FORCE: 4000,
      SHADING: false,
      COLOR_UPDATE_SPEED: 0,
      PAUSED: false,
      BACK_COLOR: { r: 0, g: 0, b: 0 },
      TRANSPARENT: true,
    }

    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = 256
      config.SHADING = false
    }

    const _blit = blit(gl)
    function p() { return { id: -1, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, down: false, moved: false, color: [0, 0, 0] } }
    let pointers = [p()]
    let dye, velocity, divergence, curl, pressure
    let lastUpdateTime = Date.now()

    const bvs = baseVertexShader(gl)
    const copyProgram = new Program(gl, bvs, copyShader(gl))
    const clearProgram = new Program(gl, bvs, clearShader(gl))
    const splatProgram = new Program(gl, bvs, splatShader(gl))
    const advectionProgram = new Program(gl, bvs, advectionShader(gl, ext))
    const divergenceProgram = new Program(gl, bvs, divergenceShader(gl))
    const curlProgram = new Program(gl, bvs, curlShader(gl))
    const vorticityProgram = new Program(gl, bvs, vorticityShader(gl))
    const pressureProgram = new Program(gl, bvs, pressureShader(gl))
    const gradientSubtractProgram = new Program(gl, bvs, gradientSubtractShader(gl))
    const displayMaterial = new Material(gl, bvs, displayShaderSource)

    displayMaterial.setKeywords(config.SHADING ? ['SHADING'] : [])
    initFramebuffers()

    function initialSplat() {
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const c = { r: 0.15, g: 0.12, b: 0.08 }
      doSplat(0.5, 0.5, 0, 0, c)
      doSplat(0.3, 0.4, 200, -100, generateSophisticatedColor())
      doSplat(0.7, 0.6, -200, 100, generateSophisticatedColor())
    }

    function initFramebuffers() {
      let simRes = getResolution(config.SIM_RESOLUTION)
      let dyeRes = getResolution(config.DYE_RESOLUTION)
      const texType = ext.halfFloatTexType
      const rgba = ext.formatRGBA
      const rg = ext.formatRG
      const r = ext.formatR
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

      gl.disable(gl.BLEND)

      if (dye == null)
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
      else
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)

      if (velocity == null)
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
      else
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)

      divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
      curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
    }

    function step(dt) {
      gl.disable(gl.BLEND)

      curlProgram.bind()
      gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0))
      _blit(curl)

      vorticityProgram.bind()
      gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1))
      gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL)
      gl.uniform1f(vorticityProgram.uniforms.dt, dt)
      _blit(velocity.write)
      velocity.swap()

      divergenceProgram.bind()
      gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0))
      _blit(divergence)

      clearProgram.bind()
      gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0))
      gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE)
      _blit(pressure.write)
      pressure.swap()

      pressureProgram.bind()
      gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0))
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1))
        _blit(pressure.write)
        pressure.swap()
      }

      gradientSubtractProgram.bind()
      gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0))
      gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1))
      _blit(velocity.write)
      velocity.swap()

      advectionProgram.bind()
      gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
      if (!ext.supportLinearFiltering)
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY)
      let velocityId = velocity.read.attach(0)
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId)
      gl.uniform1i(advectionProgram.uniforms.uSource, velocityId)
      gl.uniform1f(advectionProgram.uniforms.dt, dt)
      gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION)
      _blit(velocity.write)
      velocity.swap()

      if (!ext.supportLinearFiltering)
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY)
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1))
      gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION)
      _blit(dye.write)
      dye.swap()
    }

    function render() {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
      displayMaterial.bind()
      if (config.SHADING)
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / canvas.width, 1.0 / canvas.height)
      gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0))
      _blit(null)
    }

    function splatPointer(pointer) {
      let dx = pointer.deltaX * config.SPLAT_FORCE
      let dy = pointer.deltaY * config.SPLAT_FORCE
      doSplat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color)
    }

    function doSplat(x, y, dx, dy, color) {
      splatProgram.bind()
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0))
      gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height)
      gl.uniform2f(splatProgram.uniforms.point, x, y)
      gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0)
      gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0))
      _blit(velocity.write)
      velocity.swap()

      gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0))
      gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b)
      _blit(dye.write)
      dye.swap()
    }

    let animId

    function tick() {
      const dt = calcDeltaTime()
      if (resizeCanvas()) initFramebuffers()
      applyInputs()
      step(dt)
      render()
      animId = requestAnimationFrame(tick)
    }

    function calcDeltaTime() {
      let now = Date.now()
      let dt = (now - lastUpdateTime) / 1000
      dt = Math.min(dt, 0.016666)
      lastUpdateTime = now
      return dt
    }

    function resizeCanvas() {
      let w = scaleByPixelRatio(canvas.clientWidth)
      let h = scaleByPixelRatio(canvas.clientHeight)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        return true
      }
      return false
    }

    function applyInputs() {
      pointers.forEach(p => { if (p.moved) { p.moved = false; splatPointer(p) } })
    }

    function correctRadius(radius) {
      let aspectRatio = canvas.width / canvas.height
      if (aspectRatio > 1) radius *= aspectRatio
      return radius
    }

    function correctDeltaX(delta) {
      let aspectRatio = canvas.width / canvas.height
      if (aspectRatio < 1) delta *= aspectRatio
      return delta
    }

    function correctDeltaY(delta) {
      let aspectRatio = canvas.width / canvas.height
      if (aspectRatio > 1) delta /= aspectRatio
      return delta
    }

    function onMouseDown(e) {
      let p = pointers[0]
      let posX = scaleByPixelRatio(e.clientX)
      let posY = scaleByPixelRatio(e.clientY)
      p.down = true
      p.texcoordX = posX / canvas.width
      p.texcoordY = 1.0 - posY / canvas.height
      p.prevTexcoordX = p.texcoordX
      p.prevTexcoordY = p.texcoordY
      p.deltaX = 0
      p.deltaY = 0
      p.color = generateSophisticatedColor()
    }

    function onMouseMove(e) {
      let p = pointers[0]
      let posX = scaleByPixelRatio(e.clientX)
      let posY = scaleByPixelRatio(e.clientY)
      p.prevTexcoordX = p.texcoordX
      p.prevTexcoordY = p.texcoordY
      p.texcoordX = posX / canvas.width
      p.texcoordY = 1.0 - posY / canvas.height
      p.deltaX = correctDeltaX(p.texcoordX - p.prevTexcoordX)
      p.deltaY = correctDeltaY(p.texcoordY - p.prevTexcoordY)
      p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0
      if (p.moved && !p.down) {
        p.color = generateSophisticatedColor()
      }
    }

    function onTouchStart(e) {
      const touch = e.targetTouches[0]
      if (!touch) return
      let p = pointers[0]
      let posX = scaleByPixelRatio(touch.clientX)
      let posY = scaleByPixelRatio(touch.clientY)
      p.down = true
      p.texcoordX = posX / canvas.width
      p.texcoordY = 1.0 - posY / canvas.height
      p.prevTexcoordX = p.texcoordX
      p.prevTexcoordY = p.texcoordY
      p.deltaX = 0
      p.deltaY = 0
      p.color = generateSophisticatedColor()
    }

    function onTouchMove(e) {
      const touch = e.targetTouches[0]
      if (!touch) return
      let p = pointers[0]
      let posX = scaleByPixelRatio(touch.clientX)
      let posY = scaleByPixelRatio(touch.clientY)
      p.prevTexcoordX = p.texcoordX
      p.prevTexcoordY = p.texcoordY
      p.texcoordX = posX / canvas.width
      p.texcoordY = 1.0 - posY / canvas.height
      p.deltaX = correctDeltaX(p.texcoordX - p.prevTexcoordX)
      p.deltaY = correctDeltaY(p.texcoordY - p.prevTexcoordY)
      p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0
    }

    function onTouchEnd() {
      pointers[0].down = false
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    requestAnimationFrame(() => {
      initialSplat()
    })

    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }

    function createPointer() {
      return {
        id: -1, texcoordX: 0, texcoordY: 0,
        prevTexcoordX: 0, prevTexcoordY: 0,
        deltaX: 0, deltaY: 0,
        down: false, moved: false,
        color: [0, 0, 0],
      }
    }

    function getResolution(resolution) {
      let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
      if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio
      const min = Math.round(resolution)
      const max = Math.round(resolution * aspectRatio)
      if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min }
      else return { width: min, height: max }
    }

    function scaleByPixelRatio(input) {
      return Math.floor(input * (window.devicePixelRatio || 1))
    }

    function generateSophisticatedColor() {
      const hue = 155 + Math.random() * 60
      const sat = 0.4 + Math.random() * 0.3
      const val = 0.4 + Math.random() * 0.2
      return HSVtoRGB(hue / 360, sat, val)
    }

    function HSVtoRGB(h, s, v) {
      let r, g, b, i, f, p, q, t
      i = Math.floor(h * 6)
      f = h * 6 - i
      p = v * (1 - s)
      q = v * (1 - f * s)
      t = v * (1 - (1 - f) * s)
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break
        case 1: r = q; g = v; b = p; break
        case 2: r = p; g = v; b = t; break
        case 3: r = p; g = q; b = v; break
        case 4: r = t; g = p; b = v; break
        case 5: r = v; g = p; b = q; break
      }
      return { r, g, b }
    }

    function createFBO(w, h, internalFormat, format, type, param) {
      gl.activeTexture(gl.TEXTURE0)
      let texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
      let fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return {
        texture, fbo, width: w, height: h,
        texelSizeX: 1.0 / w, texelSizeY: 1.0 / h,
        attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id },
      }
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param)
      let fbo2 = createFBO(w, h, internalFormat, format, type, param)
      return {
        width: w, height: h,
        texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
        get read() { return fbo1 }, set read(v) { fbo1 = v },
        get write() { return fbo2 }, set write(v) { fbo2 = v },
        swap() { let t = fbo1; fbo1 = fbo2; fbo2 = t },
      }
    }

    function resizeFBO(target, w, h, internalFormat, format, type, param) {
      let newFBO = createFBO(w, h, internalFormat, format, type, param)
      copyProgram.bind()
      gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0))
      _blit(newFBO)
      return newFBO
    }

    function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
      if (target.width === w && target.height === h) return target
      target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param)
      target.write = createFBO(w, h, internalFormat, format, type, param)
      target.width = w; target.height = h
      target.texelSizeX = 1.0 / w; target.texelSizeY = 1.0 / h
      return target
    }

    function getWebGLContext(canvas) {
      const params = {
        alpha: true, depth: false, stencil: false,
        antialias: false, preserveDrawingBuffer: false,
      }
      let gl = canvas.getContext('webgl2', params)
      const isWebGL2 = !!gl
      if (!isWebGL2)
        gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)

      let halfFloat
      let supportLinearFiltering
      if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float')
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear')
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float')
        supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear')
      }

      gl.clearColor(0, 0, 0, 0)
      const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES
      let formatRGBA, formatRG, formatR

      if (isWebGL2) {
        formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType)
        formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType)
        formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType)
      } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
      }

      return {
        gl,
        ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering },
      }
    }

    function getSupportedFormat(gl, internalFormat, format, type) {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
          case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type)
          case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type)
          default: return null
        }
      }
      return { internalFormat, format }
    }

    function supportRenderTextureFormat(gl, internalFormat, format, type) {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    }
  }, [prefersReducedMotion])

  if (prefersReducedMotion) return null

  return (
    <canvas
      ref={canvasRef}
      id="fluid"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

function createProgram(gl, vertexShader, fragmentShader) {
  let program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.trace(gl.getProgramInfoLog(program))
  return program
}

function getUniforms(gl, program) {
  let uniforms = []
  let count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < count; i++) {
    let name = gl.getActiveUniform(program, i).name
    uniforms[name] = gl.getUniformLocation(program, name)
  }
  return uniforms
}

function compileShader(gl, type, source, keywords) {
  if (keywords) {
    let ks = keywords.map(k => '#define ' + k + '\n').join('')
    source = ks + source
  }
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    console.trace(gl.getShaderInfoLog(shader))
  return shader
}

function addKeywords(source, keywords) {
  if (!keywords) return source
  return keywords.map(k => '#define ' + k + '\n').join('') + source
}

function blit(gl) {
  return (target, clear = false) => {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    } else {
      gl.viewport(0, 0, target.width, target.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    }
    if (clear) {
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }
}

class Material {
  constructor(gl, vertexShader, fragmentShaderSource) {
    this.gl = gl
    this.vertexShader = vertexShader
    this.fragmentShaderSource = fragmentShaderSource
    this.programs = []
    this.activeProgram = null
    this.uniforms = []
  }

  setKeywords(keywords) {
    let hash = 0
    for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i])
    let program = this.programs[hash]
    if (program == null) {
      let fragmentShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords)
      program = createProgram(this.gl, this.vertexShader, fragmentShader)
      this.programs[hash] = program
    }
    if (program === this.activeProgram) return
    this.uniforms = getUniforms(this.gl, program)
    this.activeProgram = program
  }

  bind() { this.gl.useProgram(this.activeProgram) }
}

class Program {
  constructor(gl, vertexShader, fragmentShader) {
    this.gl = gl
    this.uniforms = {}
    this.program = createProgram(gl, vertexShader, fragmentShader)
    this.uniforms = getUniforms(gl, this.program)
  }
  bind() { this.gl.useProgram(this.program) }
}

function baseVertexShader(gl) {
  return compileShader(gl, gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `)
}

function copyShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    void main () { gl_FragColor = texture2D(uTexture, vUv); }
  `)
}

function clearShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
  `)
}

function splatShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `)
}

function advectionShader(gl, ext) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;
    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
    void main () {
    #ifdef MANUAL_FILTERING
      vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
      vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = texture2D(uSource, coord);
    #endif
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }
  `, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING'])
}

function divergenceShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `)
}

function curlShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
  `)
}

function vorticityShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `)
}

function pressureShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `)
}

function gradientSubtractShader(gl) {
  return compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `)
}

const displayShaderSource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform vec2 texelSize;
  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
  #ifdef SHADING
    vec3 lc = texture2D(uTexture, vL).rgb;
    vec3 rc = texture2D(uTexture, vR).rgb;
    vec3 tc = texture2D(uTexture, vT).rgb;
    vec3 bc = texture2D(uTexture, vB).rgb;
    float dx = length(rc) - length(lc);
    float dy = length(tc) - length(bc);
    vec3 n = normalize(vec3(dx, dy, length(texelSize)));
    vec3 l = vec3(0.0, 0.0, 1.0);
    float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
    c *= diffuse;
  #endif
    float a = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c, a);
  }
`

function hashCode(s) {
  if (s.length === 0) return 0
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return hash
}
