import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../ViewModel/auth/auth_viewmodel.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {

  //  CONTROLLERS
  final nameController = TextEditingController();
  final phoneController = TextEditingController();
  final emailController = TextEditingController();
  final addressController = TextEditingController();

  final aadharController = TextEditingController();
  final panController = TextEditingController();

  final bankNameController = TextEditingController();
  final accountHolderController = TextEditingController();
  final accountNumberController = TextEditingController();
  final ifscController = TextEditingController();

  //  IMAGE
  File? profileImage;
  File? aadharFront;
  File? aadharBack;
  File? panImage;

  String? activeField;

  final picker = ImagePicker();

  Future<void> pickImage(Function(File) onPick) async {
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      onPick(File(picked.path));
    }
  }


  @override
  void initState() {
    super.initState();

    final vm = Provider.of<AuthViewModel>(context, listen: false);
    final user = vm.user;

    if (user != null) {
      nameController.text = user.name;
      phoneController.text = user.phone;
      emailController.text = user.email;
      addressController.text = user.address;

      aadharController.text = user.aadharNumber;
      panController.text = user.panNumber;

      bankNameController.text = user.bankName;
      accountHolderController.text = user.accountHolder;
      accountNumberController.text = user.accountNumber;
      ifscController.text = user.ifscCode;

      //  LOAD DROPDOWN
      vm.selectedState = user.state;
      vm.selectedCity = user.city;
      vm.selectedLocality = user.locality;

      vm.selectedCategory = user.category;
      vm.selectedSubCategory = user.subCategory.isNotEmpty ? user.subCategory : 'General';
      vm.selectedServices = user.services.split(',');

      //  LOAD IMAGES
      if (user.profileImage != null && user.profileImage!.isNotEmpty && !user.profileImage!.startsWith('/uploads')) {
        profileImage = File(user.profileImage!);
      }
      if (user.aadharFront.isNotEmpty && !user.aadharFront.startsWith('/uploads')) {
        aadharFront = File(user.aadharFront);
      }
      if (user.aadharBack.isNotEmpty && !user.aadharBack.startsWith('/uploads')) {
        aadharBack = File(user.aadharBack);
      }
      if (user.panImage.isNotEmpty && !user.panImage.startsWith('/uploads')) {
        panImage = File(user.panImage);
      }
    }
  }


  @override
  Widget build(BuildContext context) {

    final vm = Provider.of<AuthViewModel>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Edit Profile",style: TextStyle(color: Colors.white),),
        backgroundColor: const Color(0xFF0B5FA5),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [

            //  PROFILE IMAGE
            GestureDetector(
              onTap: () => pickImage((file) => setState(() => profileImage = file)),
              child: CircleAvatar(
                radius: 50,
                backgroundImage: profileImage != null
                    ? FileImage(profileImage!)
                    : (vm.user!.profileImage != null && vm.user!.profileImage!.isNotEmpty)
                        ? (vm.user!.profileImage!.startsWith('http')
                            ? NetworkImage(vm.user!.profileImage!)
                            : NetworkImage("${AuthViewModel.imageBaseUrl}${vm.user!.profileImage!}"))
                        : null as ImageProvider?,
                child: (profileImage == null && (vm.user!.profileImage == null || vm.user!.profileImage!.isEmpty))
                    ? Icon(Icons.camera_alt)
                    : null,
              ),
            ),

            const SizedBox(height: 20),
            // name 

            buildField("Name", nameController),
            
            // phone

            TextField(
              controller: phoneController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "phone";
                });

                //  auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },


              decoration: InputDecoration(
                labelText: "Phone",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),

            if(activeField =="phone")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),

            buildField("Email", emailController),
            buildField("Address", addressController),

            const SizedBox(height: 10),

            //  STATE
            DropdownButtonFormField<String>(
              value: vm.selectedState,
              hint: Text("State"),
              decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.grey[100],
                  contentPadding: EdgeInsets.symmetric(horizontal: 16,vertical: 12),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!,width: 1)
                  ),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.blue,width: 2)
                  )
              ),



              items: vm.locationData.keys
                  .map<DropdownMenuItem<String>>((e) =>
                  DropdownMenuItem(value: e, child: Text(e)))
                  .toList(),
              onChanged: (val) => vm.selectState(val!),
            ),

            SizedBox(height: 15,),

            DropdownButtonFormField<String>(
              value: vm.selectedCity,
              hint: Text("City"),
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding: EdgeInsets.symmetric(horizontal: 16,vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[300]!,width: 1)
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue,width: 2)
                )
              ),
              items: vm.selectedState != null
                  ? (vm.locationData[vm.selectedState!]!.keys
                  .map<DropdownMenuItem<String>>((e) =>
                  DropdownMenuItem(value: e, child: Text(e)))
                  .toList())
                  : [],
              onChanged: (val) => vm.selectCity(val!),
            ),
            SizedBox(height: 15,),

            DropdownButtonFormField<String>(
              value: vm.selectedLocality,
              hint: Text("Locality"),
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding: EdgeInsets.symmetric(horizontal: 16,vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color:Colors.grey[300]!,width: 1,),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue,width: 2)
                )
              ),
              items: (vm.selectedState != null && vm.selectedCity != null)
                  ? (vm.locationData[vm.selectedState!]![vm.selectedCity!]!
                  .map<DropdownMenuItem<String>>((e) =>
                  DropdownMenuItem(value: e, child: Text(e)))
                  .toList())
                  : [],
              onChanged: (val) => vm.selectLocality(val!),
            ),

            const SizedBox(height: 10),

            //  CATEGORY
            DropdownButtonFormField<String>(
              value: vm.selectedCategory,
              hint: Text("Category"),
              decoration:InputDecoration(
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding: EdgeInsets.symmetric(horizontal: 16,vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[300]!,width: 1),
                  
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color:Colors.blue,width: 2)
                )
              ),

              items: vm.categoryData.keys
                  .map<DropdownMenuItem<String>>((e) =>
                  DropdownMenuItem(value: e, child: Text(e)))
                  .toList(),
              onChanged: (val) {
                vm.selectCategory(val!);
              },
            ),

            const SizedBox(height: 10),

            //  SERVICES
            Wrap(
              children: (vm.selectedCategory != null && vm.selectedSubCategory != null
                  ? vm.categoryData[vm.selectedCategory!]![vm.selectedSubCategory!]!
                  : <String>[])
                  .map<Widget>((service) {

                final selected = vm.selectedServices.contains(service);

                return GestureDetector(
                  onTap: () {
                    selected
                        ? vm.selectedServices.remove(service)
                        : vm.selectedServices.add(service);
                    vm.notifyListeners();
                  },
                  child: Container(
                    margin: EdgeInsets.all(5),
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? Colors.blue : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Text(service),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 10),

            TextField(
              controller: aadharController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "Aadhaar";
                });

                //  auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },


              decoration: InputDecoration(
                labelText: "Aadhaar",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),

            if(activeField =="Aadhaar")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                  style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),
            SizedBox(height: 15,),

            GestureDetector(
              onTap: () {
                setState(() {
                  activeField = "front image";
                });

                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },
              child: Container(
                height: 80,
                color: Colors.grey.shade300,
                child: aadharFront != null
                    ? Image.file(aadharFront!, fit: BoxFit.cover)
                    : (vm.user!.aadharFront.isNotEmpty
                        ? (vm.user!.aadharFront.startsWith('http')
                            ? Image.network(vm.user!.aadharFront, fit: BoxFit.cover)
                            : Image.network("${AuthViewModel.imageBaseUrl}${vm.user!.aadharFront}", fit: BoxFit.cover))
                        : Center(child: Text("Front Image"))),
              ),
            ),

            if(activeField == "front image")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text(
                  "Cannot be changed",
                  style: TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),
            SizedBox(height: 15,),

            GestureDetector(
              onTap: () {
                setState(() {
                  activeField = "back image";
                });

                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },
              child: Container(
                height: 80,
                color: Colors.grey.shade300,
                child: aadharBack != null
                    ? Image.file(aadharBack!, fit: BoxFit.cover)
                    : (vm.user!.aadharBack.isNotEmpty
                        ? (vm.user!.aadharBack.startsWith('http')
                            ? Image.network(vm.user!.aadharBack, fit: BoxFit.cover)
                            : Image.network("${AuthViewModel.imageBaseUrl}${vm.user!.aadharBack}", fit: BoxFit.cover))
                        : Center(child: Text("Back Image"))),
              ),
            ),

            if(activeField == "back image")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text(
                  "Cannot be changed",
                  style: TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),

            SizedBox(height: 15,),
                                     //pan number

            TextField(
              controller: panController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "pan";
                });

                //  auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },


              decoration: InputDecoration(
                labelText: "Pan Number",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),

            if(activeField=="pan")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                  style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),


                                         //Pan image

            SizedBox(height: 15,),


            GestureDetector(
              onTap: () {
                setState(() {
                  activeField = "panImage";
                });

                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },
              child: Container(
                height: 80,
                color: Colors.grey.shade300,
                child: panImage != null
                    ? Image.file(panImage!, fit: BoxFit.cover)
                    : (vm.user!.panImage.isNotEmpty
                        ? (vm.user!.panImage.startsWith('http')
                            ? Image.network(vm.user!.panImage, fit: BoxFit.cover)
                            : Image.network("${AuthViewModel.imageBaseUrl}${vm.user!.panImage}", fit: BoxFit.cover))
                        : Center(child: Text("PAN Image"))),
              ),
            ),

            if(activeField == "panImage")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text(
                  "Cannot be changed",
                  style: TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),

            const SizedBox(height: 10),

            TextField(
              controller:bankNameController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "bank name ";
                });

                //  auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },


              decoration: InputDecoration(
                labelText: "Bank Name",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),

            if(activeField == "bank name ")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                  style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),



            SizedBox(height: 15,),


            TextField(
              controller: accountHolderController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "account holder name";
                });

                // auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },


              decoration: InputDecoration(
                labelText: "Account Holder Name",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),

            if(activeField =="account holder name")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                  style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),

            SizedBox(height: 15,),
            TextField(
              controller: accountNumberController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "account number";
                });

                //  auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },




              decoration: InputDecoration(
                labelText: "Account Number",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),


            if(activeField=="account number")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                  style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),

            SizedBox(height: 15,),

            TextField(
              controller: ifscController,
              readOnly: true,
              //  locked

              onTap: () {
                setState(() {
                  activeField = "ifsc";
                });

                // auto hide
                Future.delayed(Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      activeField = null;
                    });
                  }
                });
              },


              decoration: InputDecoration(
                labelText: "IFSC Code",
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding:
                EdgeInsets.symmetric(horizontal: 16, vertical: 12),

                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: Colors.grey[300]!,
                    width: 1,
                  ),
                ),

                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.blue, width: 2),
                ),


              ),
            ),

            if(activeField =="ifsc")
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text("cannot be changed",
                  style: TextStyle(color: Colors.red,fontSize: 12),
                ),
              ),

            const SizedBox(height: 20),

            Container(
              width:double.infinity,
              height: 55,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                gradient: LinearGradient(colors: [Colors.blue,Colors.green])
              ),
              child: ElevatedButton(
                onPressed: vm.isUpdating
                    ? null
                    : () async {
                        final success = await vm.updateProfile(
                          name: nameController.text.isNotEmpty
                              ? nameController.text
                              : vm.user!.name,
                          email: emailController.text.isNotEmpty
                              ? emailController.text
                              : vm.user!.email,
                          address: addressController.text.isNotEmpty
                              ? addressController.text
                              : vm.user!.address,
                          state: vm.selectedState ?? vm.user!.state,
                          city: vm.selectedCity ?? vm.user!.city,
                          locality: vm.selectedLocality ?? vm.user!.locality,
                          category: vm.selectedCategory ?? vm.user!.category,
                          subCategory: vm.selectedSubCategory ?? vm.user!.subCategory,
                          services: vm.selectedServices.isNotEmpty
                              ? vm.selectedServices.join(',')
                              : vm.user!.services,
                          newProfileImagePath: profileImage?.path,
                        );

                        if (success) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Profile updated successfully")),
                          );
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Failed to update profile")),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                ),
                child: vm.isUpdating
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text("Update", style: TextStyle(color: Colors.white)),
              ),
            ),
            SizedBox(height: 20,)
          ],
        ),
      ),
    );
  }

  Widget buildField(String title, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [

        Text(title),
        TextField(controller: controller,
        decoration: InputDecoration(
          filled: true,
          fillColor: Colors.grey[100],
          contentPadding: EdgeInsets.symmetric(horizontal: 16,vertical: 12),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: Colors.grey[300]!,
              width: 1
            )
          ),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.blue,width: 2)
          )
        ),
        ),
        const SizedBox(height: 15),
      ],
    );
  }
}