import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:app_links/app_links.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../utils/app_colors.dart';
import '../payment/payment_screen.dart';
import 'package:video_player/video_player.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late VideoPlayerController _videoController;
  bool _updateRequired = false;
  final AppLinks appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    initDeepLinks();
    _init();
  }

  Future<void> initDeepLinks() async {
    try {
      // 1. Add a small delay to ensure platform channels are fully initialized on cold start
      await Future.delayed(const Duration(milliseconds: 500));
      
      // 2. Fetch the initial link
      final Uri? initialUri = await appLinks.getInitialLink();
      debugPrint("[DeepLink] Cold Start URI => $initialUri");
      if (initialUri != null) {
        await handleUri(initialUri);
      }
    } catch (e) {
      debugPrint("[DeepLink] Error fetching initial link: $e");
    }

    // 3. Listen for incoming links while the app is active in background/foreground
    _linkSubscription = appLinks.uriLinkStream.listen(
      (uri) {
        debugPrint("[DeepLink] Incoming Stream URI => $uri");
        handleUri(uri);
      },
      onError: (err) {
        debugPrint("[DeepLink] Stream error: $err");
      },
    );
  }

  Future<void> handleUri(Uri uri) async {
    final ref = uri.queryParameters['ref'];
    debugPrint("[DeepLink] Extracted ref query parameter: $ref");
    if (ref != null && ref.trim().isNotEmpty) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString("referralCode", ref.trim().toUpperCase());
      debugPrint("[DeepLink] Successfully saved referralCode to SharedPreferences: ${ref.trim().toUpperCase()}");
    }
  }

  Future<void> _init() async {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await checkForUpdate();
    });

    _videoController = VideoPlayerController.asset(
      'assets/video/splash.mp4',
    )..initialize().then((_) {
        setState(() {});
        _videoController.play();
      });

    _videoController.addListener(() async {
      if (_videoController.value.isInitialized &&
          !_videoController.value.isPlaying &&
          _videoController.value.position >= _videoController.value.duration) {
        if (_updateRequired) return;
        await navigateBasedOnStatus();
      }
    });
  }

  Future<void> navigateBasedOnStatus() async {
    final prefs = await SharedPreferences.getInstance();
    // prefs.clear();
    String? token = prefs.getString("token");
    if (token == null || token.isEmpty) {
      Navigator.pushReplacementNamed(context, "/login");
      return;
    }
    bool isPaid = prefs.getBool("isPaid") ?? false;
    bool isApproved = prefs.getBool("isApproved") ?? false;
    if (!isPaid) {
      try {
        int partnerId = prefs.getInt("partnerId") ?? 0;
        final response = await http.post(
          Uri.parse(
            "https://partner-backend-2.onrender.com/api/partner/pay-registration",
          ),
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer $token",
          },
          body: jsonEncode({
            "partnerId": partnerId,
          }),
        );
        final data = jsonDecode(response.body);
        if (data["success"] == true) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (_) => PaymentScreenNew(
                paymentOrderId: data["razorpayOrderId"],
                userPhoneNumber: data["partner"]["phone"],
                orderId: data["partner"]["id"],
                title: "Partner Registration",
                amount: data["amount"].toString(),
              ),
            ),
            (route) => false,
          );
        }
      } catch (e) {
        print("Payment API Error: $e");
      }
      return;
    }
    if (!isApproved) {
      Navigator.pushReplacementNamed(
        context,
        "/approval_pending",
      );
      return;
    }
    Navigator.pushReplacementNamed(
      context,
      "/main",
    );
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _videoController.dispose();
    super.dispose();
  }

  Future<void> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      final response = await http.get(
        Uri.parse(
          "https://partner-backend-2.onrender.com/api/settings/version",
        ),
      );
      final data = jsonDecode(response.body);
      if (data["success"] != true) return;
      final versionData = Platform.isAndroid ? data["android"] : data["ios"];
      print("Platform: ${Platform.isAndroid ? "Android" : "iOS"}");
      print("Latest Version: ${versionData["latestVersion"]}");
      print(Platform.isAndroid);

      final latestVersion = versionData["latestVersion"];
      final forceUpdate = versionData["forceUpdate"];
      if (_isUpdateAvailable(currentVersion, latestVersion)) {
        _updateRequired = true;
        _showUpdateDialog(
          forceUpdate: forceUpdate,
        );
        return;
      }
    } catch (e) {
      debugPrint("Version Check Error: $e");
    }
  }

  bool _isUpdateAvailable(String current, String latest) {
    List<int> currentParts = current.split('.').map(int.parse).toList();
    List<int> latestParts = latest.split('.').map(int.parse).toList();
    for (int i = 0; i < latestParts.length; i++) {
      if (currentParts[i] < latestParts[i]) {
        return true;
      } else if (currentParts[i] > latestParts[i]) {
        return false;
      }
    }
    return false;
  }

  void _showUpdateDialog({
    required bool forceUpdate,
  }) {
    showDialog(
      context: context,
      barrierDismissible: !forceUpdate,
      builder: (_) {
        return PopScope(
          canPop: !forceUpdate,
          child: Dialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    height: 80,
                    width: 80,
                    decoration: BoxDecoration(
                      color: AppColors.primaryButton.withOpacity(.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.system_update_alt_rounded,
                      color: AppColors.primaryButton,
                      size: 45,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    "Update Available",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    forceUpdate
                        ? "A new version of HomeFaciliti is required to continue using the app."
                        : "A new version of HomeFaciliti is available with improvements and bug fixes.",
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Colors.black54,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryButton,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () async {
                        final url = Platform.isAndroid
                            ? "https://play.google.com/store/apps/details?id=com.homefaciliti.partner"
                            : "https://apps.apple.com/app/id6780466527";

                        await launchUrl(
                          Uri.parse(url),
                          mode: LaunchMode.externalApplication,
                        );
                      },
                      child: const Text(
                        "Update Now",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SizedBox(
          height: 180,
          width: 180,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: _videoController.value.aspectRatio,
              child: VideoPlayer(_videoController),
            ),
          ),
        ),
      ),
    );
  }
}
