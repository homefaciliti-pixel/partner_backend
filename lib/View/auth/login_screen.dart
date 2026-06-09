import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hf_partner/View/auth/register_screen.dart';
import 'package:hf_partner/ViewModel/auth/auth_viewmodel.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool isPasswordVisible = false;

  @override
  Widget build(BuildContext context) {

    final vm = Provider.of<AuthViewModel>(context);

    //  MVVM NAVIGATION (LOGIN → HOME / PAYMENT)
    if (vm.isLoginSuccess) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final partnerId = vm.user?.id ?? 0;
        if (partnerId > 0 && !(vm.user?.isPaid ?? false)) {
          final Uri url = Uri.parse("${AuthViewModel.baseUrl}/partner/pay-redirect?partnerId=$partnerId");
          try {
            if (await canLaunchUrl(url)) {
              await launchUrl(url, mode: LaunchMode.externalApplication);
            }
          } catch (e) {
            debugPrint("Could not launch payment redirect: $e");
          }
        }
        Navigator.pushReplacementNamed(context, '/home');
        vm.resetLogin(); //  reset flag (important)
      });
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade200,

      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              SizedBox(height: 60),

              //Title
              Text(
                "Welcome Back !",
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 10),

              Text(
                "Enter Your Phone Number & Password",
                style: TextStyle(fontSize: 16, color: Colors.black),
              ),

              SizedBox(height: 30),

              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadiusGeometry.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 6)],
                ),
                child: TextField(
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  controller: phoneController,
                  decoration: InputDecoration(
                    prefixIcon: Icon(Icons.phone),
                    hintText: "Phone Number",
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(16),
                  ),
                ),
              ),
              SizedBox(height: 20),

              // password Field
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 6)],
                ),
                child: TextField(
                  controller: passwordController,
                  obscureText: !isPasswordVisible,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock),
                    hintText: "Password",
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                    suffixIcon: IconButton(
                      icon: Icon(
                        isPasswordVisible
                            ? Icons.visibility
                            : Icons.visibility_off,
                      ),
                      onPressed: () {
                        setState(() {
                          isPasswordVisible = !isPasswordVisible;
                        });
                      },
                    ),
                  ),
                ),
              ),

              SizedBox(height: 10),

              ///Forgot Password
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    //  TODO: Forgot Password Screen
                  },
                  child: Text("Forget Password?", selectionColor: Colors.blue),
                ),
              ),

              Spacer(),

              //Login Button (Gradient)
              Container(
                width: double.infinity,
                height: 55,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(30),
                  gradient: LinearGradient(colors: [Colors.blue, Colors.green]),
                ),

                child: ElevatedButton(
                  onPressed: () {
                    // LOGIN CALL
                    vm.login(
                      phoneController.text,
                      passwordController.text,
                      context,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                  ),
                  child: vm.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                    "Log In ",
                    style: TextStyle(fontSize: 18),
                  ),
                ),
              ),
              SizedBox(height: 20,),

              //Register Button
              OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                      minimumSize: Size(double.infinity,55),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30)
                      ),
                      side: BorderSide(color: Colors.blue)
                  ),
                  child: Text(
                    "Register as New Partner",
                    style: TextStyle(fontSize: 16),
                  )
              ),
              SizedBox(height: 20,)
            ],
          ),
        ),
      ),
    );
  }
}