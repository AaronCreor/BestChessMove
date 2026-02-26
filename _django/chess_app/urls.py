from django.urls import path

from . import views


urlpatterns = [
    path("", views.index, name="home"),
    path("api/calculate-next-move/", views.calculate_next_move, name="calculate_next_move"),
]

