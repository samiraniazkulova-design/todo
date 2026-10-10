from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render

def home_view(request):               
    return render(request, 'index.html')

urlpatterns = [
    path('', home_view),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/', include('tasks.urls')),
] 