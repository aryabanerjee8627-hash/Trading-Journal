from django.urls import path
from . import views

app_name = 'journal'

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    # Trade management
    path('trades/add/', views.trade_create, name='trade_create'),
    path('trades/<int:trade_id>/edit/', views.trade_update, name='trade_update'),
    path('trades/<int:trade_id>/delete/', views.trade_delete, name='trade_delete'),
    # Trade list
    path('', views.trade_list, name='trade_list'),
]