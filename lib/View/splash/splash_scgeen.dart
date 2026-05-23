import 'package:flutter/material.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();


}

class _SplashScreenState extends State<SplashScreen> {

  @override
  void initState(){
    super.initState();
    startTimer();
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text("HomeFacility",
        style: TextStyle(fontSize: 28,fontWeight: FontWeight.bold),
        ),
      ),
    );

  }
  void startTimer() async {
    await Future.delayed(const Duration(seconds: 3));

    Navigator.pushReplacementNamed(context, '/login');
  }


}
