// ✅ SAME FILE - ONLY FIXED (NO UI CHANGE)

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../ViewModel/auth/auth_viewmodel.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {

  // ================= STATE =================
  Widget buildStateDropdown(AuthViewModel vm) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("State"),
        Container(
          margin: const EdgeInsets.only(bottom: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DropdownButton<String>(
            value: vm.selectedState,
            hint: const Text("Select State"),
            isExpanded: true,
            underline: const SizedBox(),
            items: vm.locationData.keys
                .map((e) => DropdownMenuItem(
              value: e,
              child: Text(e),
            ))
                .toList(),
            onChanged: (val) {
              vm.selectState(val.toString());
            },
          ),
        ),
      ],
    );
  }

// ================= CITY =================
  Widget buildCityDropdown(AuthViewModel vm) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("City"),
        Container(
          margin: const EdgeInsets.only(bottom: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DropdownButton<String>(
            value: vm.selectedCity,
            hint: const Text("Select City"),
            isExpanded: true,
            underline: const SizedBox(),
            items: (vm.locationData[vm.selectedState]?.keys ?? [])
                .map((e) => DropdownMenuItem(
              value: e,
              child: Text(e),
            ))
                .toList(),
            onChanged: (val) {
              vm.selectCity(val.toString());
            },
          ),
        ),
      ],
    );
  }

// ================= LOCALITY =================
  Widget buildLocalityDropdown(AuthViewModel vm) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Locality"),
        const SizedBox(height: 5),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButton<String>(
            value: vm.selectedLocality,
            hint: const Text("Select Locality"),
            isExpanded: true,
            underline: const SizedBox(),
            items: (vm.locationData[vm.selectedState]?[vm.selectedCity] ?? [])
                .map((loc) =>
                DropdownMenuItem(value: loc, child: Text(loc)))
                .toList(),
            onChanged: (value) {
              vm.selectLocality(value!);
            },
          ),
        ),
        const SizedBox(height: 15),
      ],
    );
  }

// ================= CATEGORY =================
  Widget buildCategoryDropdown(AuthViewModel vm) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Select Category"),
        Container(
          margin: const EdgeInsets.only(bottom: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DropdownButton<String>(
            value: vm.selectedCategory,
            hint: const Text("Select Category"),
            isExpanded: true,
            underline: const SizedBox(),
            items: vm.categories
                .map((e) => DropdownMenuItem(
              value: e,
              child: Text(e),
            ))
                .toList(),
            onChanged: (val) {
              vm.selectCategory(val!);
            },
          ),
        ),
      ],
    );
  }

// ================= SUB CATEGORY =================

  Widget buildSubCategoryDropdown(AuthViewModel vm) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Sub Category"),
        Container(
          margin: const EdgeInsets.only(bottom: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DropdownButton<String>(
            value: vm.selectedSubCategory,
            hint: const Text("Select Sub Category"),
            isExpanded: true,
            underline: const SizedBox(),
            items: (vm.categoryData[vm.selectedCategory]?.keys ?? [])
                .map((e) => DropdownMenuItem(
              value: e,
              child: Text(e),
            ))
                .toList(),
            onChanged: (val) {
              vm.selectSubCategory(val!);
            },
          ),
        ),
      ],
    );
  }

// ================= SERVICES =================
  Widget buildServicesDropdown(AuthViewModel vm) {
    final services =
        vm.categoryData[vm.selectedCategory]?[vm.selectedSubCategory] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Select Services"),
        Container(
          margin: const EdgeInsets.only(bottom: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: ExpansionTile(
            title: const Text("Select Services"),
            children: services.map((service) {
              final isSelected = vm.selectedServices.contains(service);

              return CheckboxListTile(
                value: isSelected,
                title: Text(service),
                onChanged: (val) {
                  vm.toggleService(service);
                },
              );
            }).toList(),
          ),
        ),
      ],
    );
  }







  File? selectedImage;
  final ImagePicker picker = ImagePicker();

  final nameController = TextEditingController();
  final phoneController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  final addressController = TextEditingController();
  final localityController = TextEditingController();
  final aadharController = TextEditingController();
  final panController = TextEditingController();
  final bankNameController = TextEditingController();
  final accountholderController = TextEditingController();
  final accountnumberController = TextEditingController();
  final ifscController = TextEditingController();
  final referralCodeController = TextEditingController();

  bool isPasswordVisible = false;
  String gender = "Male";
  String vehicle = "No";

  File? aadharFront;
  File? aadharBack;
  File? panImage;
  File? policeVerification;

  Future<void> PickImage(ImageSource source) async {
    final pickedFile = await picker.pickImage(source: source);
    if (pickedFile != null) {
      setState(() {
        selectedImage = File(pickedFile.path);
      });
    }
  }

  void showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      builder: (_) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(Icons.camera),
              title: Text("Camera"),
              onTap: () {
                Navigator.pop(context);
                PickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: Icon(Icons.photo),
              title: Text("Gallery"),
              onTap: () {
                Navigator.pop(context);
                PickImage(ImageSource.gallery);
              },
            ),
          ],
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();

    final vm = Provider.of<AuthViewModel>(context, listen: false);
    if (!vm.isEdit) {
      vm.checkStoredReferral();
    }

    if (vm.isEdit && vm.user != null) {

      nameController.text = vm.user!.name;
      phoneController.text = vm.user!.phone;
      emailController.text = vm.user!.email;
      addressController.text = vm.user!.address;

      vm.selectedState = vm.user!.state;
      vm.selectedCity = vm.user!.city;
      vm.selectedLocality = vm.user!.locality;

      vm.selectedCategory = vm.user!.category;
      vm.selectedSubCategory = vm.user!.subCategory.isNotEmpty ? vm.user!.subCategory : 'General';

      // ✅ FIX
      vm.selectedServices =
      vm.user!.services.isNotEmpty ? vm.user!.services.split(',') : [];

      aadharController.text = vm.user!.aadharNumber;
      panController.text = vm.user!.panNumber;
      bankNameController.text = vm.user!.bankName;
      accountholderController.text = vm.user!.accountHolder;
      accountnumberController.text = vm.user!.accountNumber;
      ifscController.text = vm.user!.ifscCode;

      gender = vm.user!.gender;
      vehicle = vm.user!.hasVehicle;

      if (vm.user!.profileImage != null && vm.user!.profileImage!.isNotEmpty) {
        selectedImage = File(vm.user!.profileImage!);
      }

      if (vm.user!.aadharFront.isNotEmpty) {
        aadharFront = File(vm.user!.aadharFront);
      }

      if (vm.user!.aadharBack.isNotEmpty) {
        aadharBack = File(vm.user!.aadharBack);
      }

      if (vm.user!.panImage.isNotEmpty) {
        panImage = File(vm.user!.panImage);
      }
    }
  }

  @override
  Widget build(BuildContext context) {

    final vm = Provider.of<AuthViewModel>(context);

    // NAVIGATION FIX
    if (vm.isLoginSuccess) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final partnerId = vm.user?.id ?? 0;
        if (partnerId > 0 && !(vm.user?.isPaid ?? false)) {
          final String redirectUrl = vm.paymentUrl ?? "${AuthViewModel.baseUrl}/partner/pay-redirect?partnerId=$partnerId";
          final Uri url = Uri.parse(redirectUrl);
          try {
            if (await canLaunchUrl(url)) {
              await launchUrl(url, mode: LaunchMode.externalApplication);
            }
          } catch (e) {
            debugPrint("Could not launch payment redirect: $e");
          }
        }
        Navigator.pushReplacementNamed(context, '/home');
        vm.resetLogin();
      });
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade200,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            const SizedBox(height: 40),

            Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back),
                ),
                const Text("Create Account :)", style: TextStyle(fontSize: 20))
              ],
            ),

            const SizedBox(height: 20),

            Center(
              child: GestureDetector(
                onTap: showImagePickerOptions,
                child: CircleAvatar(
                  radius: 55,
                  backgroundColor: Colors.white,
                  backgroundImage:
                  selectedImage != null ? FileImage(selectedImage!) : null,
                  child: selectedImage == null
                      ? const Icon(Icons.camera_alt)
                      : null,
                ),
              ),
            ),

            const SizedBox(height: 20),

            buildField("Full Name", "User Name", Icons.person, nameController),
            buildField(
              "Phone",
              "Phone Number",
              Icons.phone,
              phoneController,
              keyboardType: TextInputType.phone,
            ),
            buildField("Email", "Email ID", Icons.email, emailController),
            buildField("Address", "Enter Address", Icons.home, addressController),

            buildStateDropdown(vm),
            buildCityDropdown(vm),
            buildLocalityDropdown(vm),

            if (vm.selectedLocality == "Others")
              buildField("Locality", "Locality", Icons.location_on, localityController),

            const SizedBox(height: 10),

            const Text("Gender"),
            Row(
              children: [
                buildRadio("Male"),
                buildRadio("Female"),
                buildRadio("Other"),
              ],
            ),

            buildCategoryDropdown(vm),

            const Text("Vehicle"),
            Row(
              children: [
                Radio(value: "Yes", groupValue: vehicle,
                    onChanged: (val) => setState(() => vehicle = val.toString())),
                const Text("Yes"),
                Radio(value: "No", groupValue: vehicle,
                    onChanged: (val) => setState(() => vehicle = val.toString())),
                const Text("No"),
              ],
            ),

            if (vm.selectedSubCategory != null)
              buildServicesDropdown(vm),

            const SizedBox(height: 15),

            buildField("Aadhaar Number", "Enter Aadhaar", Icons.credit_card, aadharController,
            keyboardType: TextInputType.phone
            ),
            buildImageBox("Upload Aadhaar Front", (file) => aadharFront = file, aadharFront),
            buildImageBox("Upload Aadhaar Back", (file) => aadharBack = file, aadharBack),

            buildField("PAN Number", "Enter PAN", Icons.credit_card, panController),
            buildImageBox("Upload PAN Card", (file) => panImage = file, panImage),

            const Text("Police Verification"),
            const SizedBox(height: 5),
            buildImageBox("Upload Police Verification Document", (file) => policeVerification = file, policeVerification),

            buildField("Bank Name", "Enter Bank Name", Icons.account_balance, bankNameController),
            buildField("Account Holder", "Enter Name", Icons.person, accountholderController),
            buildField("Account Number", "Enter Account No", Icons.numbers, accountnumberController,
            keyboardType:TextInputType.phone
            ),
            buildField("IFSC Code", "Enter IFSC", Icons.code, ifscController),

            // ⭐ REFERRAL CODE AUTOMATICALLY APPLIED INDICATOR
            if (vm.referralCode != null && vm.referralCode!.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 10, bottom: 15),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade300),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Referral Code Applied",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            vm.referralCode!,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade900,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else if (!vm.isEdit)
              buildField("Referral Code (Optional)", "Enter Referral Code", Icons.card_giftcard, referralCodeController),

            if (!vm.isEdit) ...[
              buildField("Password", "Password", Icons.lock, passwordController, isPassword: true),
              buildField("Confirm Password", "Confirm Password", Icons.lock, confirmPasswordController, isPassword: true),
            ],

            const SizedBox(height: 30),

            Container(
              width: double.infinity,
              height: 55,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                gradient: LinearGradient(colors: [Colors.blue, Colors.green]),
              ),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                ),
                 onPressed: () {
                  // ─── Text field validation ───
                  if (nameController.text.trim().isEmpty) {
                    vm.showMessage(context, "Full Name is required");
                    return;
                  }
                  if (phoneController.text.trim().isEmpty) {
                    vm.showMessage(context, "Phone Number is required");
                    return;
                  }
                  if (emailController.text.trim().isEmpty) {
                    vm.showMessage(context, "Email is required");
                    return;
                  }
                  if (addressController.text.trim().isEmpty) {
                    vm.showMessage(context, "Address is required");
                    return;
                  }
                  if (vm.selectedState == null || vm.selectedState!.isEmpty) {
                    vm.showMessage(context, "Please select your State");
                    return;
                  }
                  if (vm.selectedCity == null || vm.selectedCity!.isEmpty) {
                    vm.showMessage(context, "Please select your City");
                    return;
                  }
                  if ((vm.selectedLocality == null || vm.selectedLocality!.isEmpty) &&
                      localityController.text.trim().isEmpty) {
                    vm.showMessage(context, "Please select or enter your Locality");
                    return;
                  }

                   if (!vm.isEdit) {
                    if (selectedImage == null) {
                      vm.showMessage(context, "Profile image is required");
                      return;
                    }
                    if (aadharFront == null || aadharBack == null) {
                      vm.showMessage(context, "Both Aadhaar Card images are required");
                      return;
                    }
                    if (panImage == null) {
                      vm.showMessage(context, "PAN Card image is required");
                      return;
                    }
                    if (policeVerification == null) {
                      vm.showMessage(context, "Police Verification image is required");
                      return;
                    }
                  }

                  vm.aadharNumber = aadharController.text;
                  vm.panNumber = panController.text;
                  vm.bankName = bankNameController.text;
                  vm.accountHolder = accountholderController.text;
                  vm.accountNumber = accountnumberController.text;
                  vm.ifscCode = ifscController.text;
                  vm.hasVehicle = vehicle;

                  vm.aadharFront = aadharFront?.path;
                  vm.aadharBack = aadharBack?.path;
                  vm.panImage = panImage?.path;
                  vm.profileImage = selectedImage?.path;
                  vm.policeVerificationImage = policeVerification?.path;

                  if (vm.referralCode == null || vm.referralCode!.trim().isEmpty) {
                    if (referralCodeController.text.trim().isNotEmpty) {
                      vm.referralCode = referralCodeController.text.trim().toUpperCase();
                    }
                  }

                  vm.register(
                    name: nameController.text,
                    phone: phoneController.text,
                    email: emailController.text,
                    address: addressController.text,
                    state: vm.selectedState ?? "",
                    city: vm.selectedCity ?? "",
                    locality: vm.selectedLocality == "Others"
                        ? localityController.text
                        : vm.selectedLocality ?? "",
                    password: passwordController.text,
                    confirmPassword: confirmPasswordController.text,
                    gender: gender,
                    context: context,
                  );

                  if (vm.isEdit) {
                    vm.disableEdit();
                  }
                },
                child: const Text("Register", style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  //  BELOW FUNCTIONS SAME (NO CHANGE)


  Widget buildImageBox(String text, Function(File) onPick, File? image) {
    return GestureDetector(
      onTap: () async {
        final picked = await picker.pickImage(source: ImageSource.gallery);
        if (picked != null) {
          setState(() {
            onPick(File(picked.path));
          });
        }
      },
      child: Container(
        height: 90,
        margin: const EdgeInsets.only(bottom: 15),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: image == null
            ? Center(child: Text(text))
            : Image.file(image, fit: BoxFit.cover),
      ),
    );
  }

  Widget buildField(
      String title,
      String hint,
      IconData icon,
      TextEditingController controller, {
        bool isPassword = false,
        TextInputType keyboardType = TextInputType.text,
      }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title),
        Container(
          margin: const EdgeInsets.only(bottom: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,

            //  YE LINE ADD KARNI HAI
            keyboardType: keyboardType,

            obscureText: isPassword ? !isPasswordVisible : false,

            decoration: InputDecoration(
              prefixIcon: Icon(icon),
              hintText: hint,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ),
      ],
    );
  }

  Widget buildRadio(String value) {
    return Row(
      children: [
        Radio(
          value: value,
          groupValue: gender,
          onChanged: (val) => setState(() => gender = val.toString()),
        ),
        Text(value),
      ],
    );
  }
}
