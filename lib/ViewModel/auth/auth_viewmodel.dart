import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../Models/user_model.dart';

class AuthViewModel extends ChangeNotifier {

  bool isLoading = false;
  bool isLoginSuccess = false;
  bool isUpdating = false;

  // Base URL config:
  // For android emulator, use 10.0.2.2. For physical devices or iOS simulators/Web, use localhost or your computer's IP.
  static const String baseUrl = "http://10.0.2.2:5000/api";
  static const String imageBaseUrl = "http://10.0.2.2:5000";
  String? token;

  AuthViewModel() {
    fetchMetadata();
  }

  // Fetch dynamic location and category dropdown options from the database
  Future<void> fetchMetadata() async {
    try {
      final responseLocations = await http.get(Uri.parse('$baseUrl/metadata/locations'));
      if (responseLocations.statusCode == 200) {
        final Map<String, dynamic> rawLocs = jsonDecode(responseLocations.body);
        Map<String, Map<String, List<String>>> parsedLocs = {};
        rawLocs.forEach((state, citiesMap) {
          Map<String, List<String>> parsedCities = {};
          (citiesMap as Map<String, dynamic>).forEach((city, localitiesList) {
            parsedCities[city] = List<String>.from(localitiesList);
          });
          parsedLocs[state] = parsedCities;
        });
        if (parsedLocs.isNotEmpty) {
          locationData = parsedLocs;
        }
      }
    } catch (e) {
      debugPrint("Error fetching dynamic locations: $e");
    }

    try {
      final responseCategories = await http.get(Uri.parse('$baseUrl/metadata/categories'));
      if (responseCategories.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(responseCategories.body);
        final List<dynamic> mainCats = data['categories'] ?? [];
        if (mainCats.isNotEmpty) {
          categories = List<String>.from(mainCats);
        }
        
        final Map<String, dynamic> rawCatData = data['categoryData'] ?? {};
        Map<String, Map<String, List<String>>> parsedCatData = {};
        rawCatData.forEach((mainCat, subsMap) {
          Map<String, List<String>> parsedSubs = {};
          (subsMap as Map<String, dynamic>).forEach((subCat, servicesList) {
            parsedSubs[subCat] = List<String>.from(servicesList);
          });
          parsedCatData[mainCat] = parsedSubs;
        });
        if (parsedCatData.isNotEmpty) {
          categoryData = parsedCatData;
        }
      }
    } catch (e) {
      debugPrint("Error fetching dynamic categories: $e");
    }
    notifyListeners();
  }

  // ================= LOGIN =================

  Future<void> login(
      String phone,
      String password,
      BuildContext context,
      ) async {

    if (phone.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text("Please enter all fields")));
      return;
    }

    isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      isLoading = false;
      if (response.statusCode == 200) {
        token = data['token'];
        final p = data['partner'];
        user = UserModel(
          name: p['name'] ?? '',
          phone: p['phone'] ?? '',
          email: p['email'] ?? '',
          gender: p['gender'] ?? '',
          address: p['address'] ?? '',
          state: p['state'] ?? '',
          city: p['city'] ?? '',
          locality: p['locality'] ?? '',
          category: p['category'] ?? '',
          subCategory: p['subCategory'] ?? '',
          hasVehicle: p['hasVehicle'] ?? '',
          services: p['services'] ?? '',
          aadharNumber: p['aadharNumber'] ?? '',
          aadharFront: p['aadharFront'] ?? '',
          aadharBack: p['aadharBack'] ?? '',
          panNumber: p['panNumber'] ?? '',
          panImage: p['panImage'] ?? '',
          bankName: p['bankName'] ?? '',
          accountHolder: p['accountHolder'] ?? '',
          accountNumber: p['accountNumber'] ?? '',
          ifscCode: p['ifscCode'] ?? '',
          profileImage: p['profileImage'] ?? '',
        );

        isLoginSuccess = true;
        notifyListeners();
        showMessage(context, "Login Successful");
      } else {
        notifyListeners();
        showMessage(context, data['error'] ?? 'Login failed');
      }
    } catch (e) {
      isLoading = false;
      notifyListeners();
      showMessage(context, "Connection Error: $e");
    }
  }

  // ================= REGISTER =================

  void resetLogin() {
    isLoginSuccess = false;
  }

  UserModel? user;

  //  EXTRA DATA VARIABLES
  String? aadharNumber;
  String? aadharFront;
  String? aadharBack;
  String? panNumber;
  String? panImage;
  String? bankName;
  String? accountHolder;
  String? accountNumber;
  String? ifscCode;
  String? hasVehicle;
  String? profileImage;

  Future<void> register({
    required String name,
    required String phone,
    required String email,
    required String address,
    required String state,
    required String city,
    required String locality,
    required String password,
    required String confirmPassword,
    required String gender,
    required BuildContext context,
  }) async {

    if (name.isEmpty ||
        phone.isEmpty ||
        email.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty ||
        address.isEmpty ||
        city.isEmpty ||
        locality.isEmpty ||
        state.isEmpty) {

      showMessage(context, "All fields required");
      return;
    }

    if (password != confirmPassword) {
      showMessage(context, "Password not match");
      return;
    }

    isLoading = true;
    notifyListeners();

    try {
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/auth/register'));

      // Add text fields
      request.fields['name'] = name;
      request.fields['phone'] = phone;
      request.fields['email'] = email;
      request.fields['address'] = address;
      request.fields['state'] = state;
      request.fields['city'] = city;
      request.fields['locality'] = locality;
      request.fields['password'] = password;
      request.fields['gender'] = gender;
      request.fields['category'] = selectedCategory ?? '';
      request.fields['subCategory'] = selectedSubCategory ?? '';
      request.fields['hasVehicle'] = hasVehicle ?? 'No';
      request.fields['services'] = selectedServices.join(',');
      request.fields['aadharNumber'] = aadharNumber ?? '';
      request.fields['panNumber'] = panNumber ?? '';
      request.fields['bankName'] = bankName ?? '';
      request.fields['accountHolder'] = accountHolder ?? '';
      request.fields['accountNumber'] = accountNumber ?? '';
      request.fields['ifscCode'] = ifscCode ?? '';

      // Add file fields
      if (profileImage != null && profileImage!.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath('profileImage', profileImage!));
      }
      if (aadharFront != null && aadharFront!.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath('aadharFront', aadharFront!));
      }
      if (aadharBack != null && aadharBack!.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath('aadharBack', aadharBack!));
      }
      if (panImage != null && panImage!.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath('panImage', panImage!));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(response.body);

      isLoading = false;
      if (response.statusCode == 201) {
        token = data['token'];
        final p = data['partner'];

        user = UserModel(
          name: p['name'] ?? '',
          phone: p['phone'] ?? '',
          email: p['email'] ?? '',
          gender: p['gender'] ?? '',
          address: p['address'] ?? '',
          state: p['state'] ?? '',
          city: p['city'] ?? '',
          locality: p['locality'] ?? '',
          category: p['category'] ?? '',
          subCategory: p['subCategory'] ?? '',
          hasVehicle: p['hasVehicle'] ?? '',
          services: p['services'] ?? '',
          aadharNumber: p['aadharNumber'] ?? '',
          aadharFront: p['aadharFront'] ?? '',
          aadharBack: p['aadharBack'] ?? '',
          panNumber: p['panNumber'] ?? '',
          panImage: p['panImage'] ?? '',
          bankName: p['bankName'] ?? '',
          accountHolder: p['accountHolder'] ?? '',
          accountNumber: p['accountNumber'] ?? '',
          ifscCode: p['ifscCode'] ?? '',
          profileImage: p['profileImage'] ?? '',
        );

        isLoginSuccess = true;
        notifyListeners();
        showMessage(context, "Register Success");
      } else {
        notifyListeners();
        showMessage(context, data['error'] ?? 'Registration failed');
      }
    } catch (e) {
      isLoading = false;
      notifyListeners();
      showMessage(context, "Connection Error: $e");
    }
  }

  Future<bool> updateProfile({
    required String name,
    required String email,
    required String address,
    required String state,
    required String city,
    required String locality,
    required String category,
    required String subCategory,
    required String services,
    String? newProfileImagePath,
  }) async {
    if (token == null) return false;

    isUpdating = true;
    notifyListeners();

    try {
      final uri = Uri.parse('$baseUrl/partner/profile');
      final request = http.MultipartRequest('PUT', uri);
      
      request.headers['Authorization'] = 'Bearer $token';

      request.fields['name'] = name;
      request.fields['email'] = email;
      request.fields['address'] = address;
      request.fields['state'] = state;
      request.fields['city'] = city;
      request.fields['locality'] = locality;
      request.fields['category'] = category;
      request.fields['subCategory'] = subCategory;
      request.fields['services'] = services;

      if (newProfileImagePath != null && newProfileImagePath.isNotEmpty && !newProfileImagePath.startsWith('/uploads')) {
        request.files.add(await http.MultipartFile.fromPath('profileImage', newProfileImagePath));
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(response.body);

      isUpdating = false;
      if (response.statusCode == 200) {
        final p = data['partner'];
        user = UserModel(
          name: p['name'] ?? '',
          phone: p['phone'] ?? '',
          email: p['email'] ?? '',
          gender: p['gender'] ?? '',
          address: p['address'] ?? '',
          state: p['state'] ?? '',
          city: p['city'] ?? '',
          locality: p['locality'] ?? '',
          category: p['category'] ?? '',
          subCategory: p['subCategory'] ?? '',
          hasVehicle: p['hasVehicle'] ?? '',
          services: p['services'] ?? '',
          aadharNumber: p['aadharNumber'] ?? '',
          aadharFront: p['aadharFront'] ?? '',
          aadharBack: p['aadharBack'] ?? '',
          panNumber: p['panNumber'] ?? '',
          panImage: p['panImage'] ?? '',
          bankName: p['bankName'] ?? '',
          accountHolder: p['accountHolder'] ?? '',
          accountNumber: p['accountNumber'] ?? '',
          ifscCode: p['ifscCode'] ?? '',
          profileImage: p['profileImage'] ?? '',
        );
        notifyListeners();
        return true;
      } else {
        notifyListeners();
        return false;
      }
    } catch (e) {
      isUpdating = false;
      notifyListeners();
      return false;
    }
  }

  // ================= COMMON =================


  void showMessage(BuildContext context, String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  // ================= EDIT =================


  bool isEdit = false;

  void enableEdit() {
    isEdit = true;
    notifyListeners();
  }

  void disableEdit() {
    isEdit = false;
  }

  // ================= GENDER =================

  String? selectedGender;

  void selectGender(String value) {
    selectedGender = value;
    notifyListeners();
  }

  // ================= LOCATION =================

  void selectState(String value) {
    selectedState = value;
    selectedCity = null;
    selectedLocality = null;
    notifyListeners();
  }

  void selectCity(String value) {
    selectedCity = value;
    notifyListeners();
  }

  void selectLocality(String value) {
    selectedLocality = value;
    notifyListeners();
  }

  // ================= CATEGORY =================

  void selectCategory(String value) {
    selectedCategory = value;
    selectedSubCategory = null;
    selectedServices.clear();
    notifyListeners();
  }

  void selectSubCategory(String value) {
    selectedSubCategory = value;
    selectedServices.clear();
    notifyListeners();
  }

  void toggleService(String service) {
    if (selectedServices.contains(service)) {
      selectedServices.remove(service);
    } else {
      selectedServices.add(service);
    }
    notifyListeners();
  }




   //logout

  void logout() {
    user = null;            //  user data clear
    isEdit = false;         //  edit mode off
    notifyListeners();
  }


  // ================= STATIC DATA =================

  Map<String, Map<String, List<String>>> locationData = {
    "Rajasthan": {
      "Jaipur": ["Vaishali Nagar", "Malviya Nagar", "Others"],

    },
  };

  List<String> categories = [
    "Electrician",
    "Plumber",
    "Carpenter",
  ];

  Map<String, Map<String, List<String>>> categoryData = {
    "Electrician": {
      "Repair": ["AC Repair", "Fan Repair"],
    },
  };

  // ================= SELECTED =================

  String? selectedState;
  String? selectedCity;
  String? selectedLocality;
  String? selectedCategory;
  String? selectedSubCategory;
  List<String> selectedServices = [];
}