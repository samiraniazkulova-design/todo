from django.contrib.auth.models import User
from rest_framework import generics, permissions
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

class RegisterSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Бул email менен аккаунт бар. Кирүү бөлүмүн колдонуңуз.')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer