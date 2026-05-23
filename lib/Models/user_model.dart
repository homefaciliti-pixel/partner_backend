import 'package:flutter/material.dart';

class UserModel {

  final String name;
  final String phone;
  final String email;
  final String gender;
  final String address;
  final String state;
  final String city;
  final String locality;

  // 🔥 SERVICE
  final String category;
  final String subCategory;
  final String hasVehicle;
  final String services;

  // 🔥 KYC
  final String aadharNumber;
  final String aadharFront;
  final String aadharBack;
  final String panNumber;
  final String panImage;

  // 🔥 BANK
  final String bankName;
  final String accountHolder;
  final String accountNumber;
  final String ifscCode;

  final String? profileImage;

  UserModel({
    required this.name,
    required this.phone,
    required this.email,
    required this.gender,
    required this.address,
    required this.state,
    required this.city,
    required this.locality,
    required this.category,
    required this.subCategory,
    required this.hasVehicle,
    required this.services,
    required this.aadharNumber,
    required this.aadharFront,
    required this.aadharBack,
    required this.panNumber,
    required this.panImage,
    required this.bankName,
    required this.accountHolder,
    required this.accountNumber,
    required this.ifscCode,
    this.profileImage,
  });

  // 🔥 ONLY ADD THIS (NO CHANGE ABOVE)
  UserModel copyWith({
    String? name,
    String? phone,
    String? email,
    String? gender,
    String? address,
    String? state,
    String? city,
    String? locality,
    String? category,
    String? subCategory,
    String? hasVehicle,
    String? services,
    String? aadharNumber,
    String? aadharFront,
    String? aadharBack,
    String? panNumber,
    String? panImage,
    String? bankName,
    String? accountHolder,
    String? accountNumber,
    String? ifscCode,
    String? profileImage,
  }) {
    return UserModel(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      gender: gender ?? this.gender,
      address: address ?? this.address,
      state: state ?? this.state,
      city: city ?? this.city,
      locality: locality ?? this.locality,
      category: category ?? this.category,
      subCategory: subCategory ?? this.subCategory,
      hasVehicle: hasVehicle ?? this.hasVehicle,
      services: services ?? this.services,
      aadharNumber: aadharNumber ?? this.aadharNumber,
      aadharFront: aadharFront ?? this.aadharFront,
      aadharBack: aadharBack ?? this.aadharBack,
      panNumber: panNumber ?? this.panNumber,
      panImage: panImage ?? this.panImage,
      bankName: bankName ?? this.bankName,
      accountHolder: accountHolder ?? this.accountHolder,
      accountNumber: accountNumber ?? this.accountNumber,
      ifscCode: ifscCode ?? this.ifscCode,
      profileImage: profileImage ?? this.profileImage,
    );
  }
}