import 'package:flutter/material.dart';
import 'package:hf_partner/View/auth/login_screen.dart';
import 'package:hf_partner/View/auth/register_screen.dart';
import 'package:hf_partner/ViewModel/auth/auth_viewmodel.dart';
import 'package:hf_partner/ViewModel/home/home_viewmodel.dart';
import 'package:hf_partner/ViewModel/referral/referral_viewmodel.dart';
import 'package:provider/provider.dart';
import 'View/mainscreen/main_screen.dart';
import 'View/mainscreen/profileScreen/edit_profile_screen.dart';
import 'View/mainscreen/profileScreen/profile_screen.dart';
import 'View/mainscreen/refer_and_earn_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthViewModel()),
        ChangeNotifierProvider(create: (_) => HomeViewModel()),
        ChangeNotifierProvider(create: (_) => ReferralViewModel()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        routes: {

          '/login': (context) => LoginScreen(),
          '/home': (context) =>MainScreen(),
          '/registerScreen':(context) => RegisterScreen(),
          '/profile': (context) => ProfileScreen(),
          '/editProfile': (context) => EditProfileScreen(),
          '/referAndEarn': (context) => const ReferAndEarnScreen(),
        },
        home:MainScreen()
      ),
    );
  }
}

