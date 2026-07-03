import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../auth/auth_viewmodel.dart';

class ReferralHistoryItem {
  final int id;
  final String type;
  final double amount;
  final String status;
  final int level;
  final String? bookingId;
  final String fromPartner;
  final String description;
  final DateTime createdAt;

  const ReferralHistoryItem({
    required this.id,
    required this.type,
    required this.amount,
    required this.status,
    required this.level,
    this.bookingId,
    required this.fromPartner,
    required this.description,
    required this.createdAt,
  });

  factory ReferralHistoryItem.fromJson(Map<String, dynamic> json) {
    return ReferralHistoryItem(
      id: json['id'] ?? 0,
      type: json['type'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      status: json['status'] ?? '',
      level: json['level'] ?? 1,
      bookingId: json['bookingId'],
      fromPartner: json['fromPartner'] ?? '',
      description: json['description'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class ReferralEntry {
  final int referralId;
  final String partnerName;
  final String phone;
  final bool isApproved;
  final String status;         // pending | unlocked | expired
  final int ordersCompleted;
  final int ordersNeeded;
  final double lockedReward;
  final DateTime? unlockDeadline;
  final DateTime? unlockedAt;
  final DateTime? expiredAt;
  final DateTime createdAt;

  const ReferralEntry({
    required this.referralId,
    required this.partnerName,
    required this.phone,
    required this.isApproved,
    required this.status,
    required this.ordersCompleted,
    required this.ordersNeeded,
    required this.lockedReward,
    this.unlockDeadline,
    this.unlockedAt,
    this.expiredAt,
    required this.createdAt,
  });

  factory ReferralEntry.fromJson(Map<String, dynamic> json) {
    return ReferralEntry(
      referralId: json['referralId'] ?? 0,
      partnerName: json['partnerName'] ?? 'Partner',
      phone: json['phone'] ?? '',
      isApproved: json['isApproved'] == true,
      status: json['status'] ?? 'pending',
      ordersCompleted: json['ordersCompleted'] ?? 0,
      ordersNeeded: json['ordersNeeded'] ?? 5,
      lockedReward: (json['lockedReward'] ?? 500).toDouble(),
      unlockDeadline: json['unlockDeadline'] != null
          ? DateTime.tryParse(json['unlockDeadline'].toString())
          : null,
      unlockedAt: json['unlockedAt'] != null
          ? DateTime.tryParse(json['unlockedAt'].toString())
          : null,
      expiredAt: json['expiredAt'] != null
          ? DateTime.tryParse(json['expiredAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class ReferralViewModel extends ChangeNotifier {
  bool isLoading = false;
  String? error;

  // Referral code
  String referralCode = '';
  String shareLink = '';
  String shareMessage = '';

  // Wallet
  double availableWallet = 0;
  double lockedWallet = 0;
  double totalWallet = 0;

  // Earnings
  double orderBonusTotal = 0;
  double referralBonusTotal = 0;
  double lockedTotal = 0;
  double grandTotal = 0;

  // Referrals list
  int referralCount = 0;
  List<ReferralEntry> referrals = [];

  // History
  bool isLoadingHistory = false;
  List<ReferralHistoryItem> history = [];
  int historyPage = 1;
  int historyTotal = 0;
  bool hasMoreHistory = true;

  Future<void> fetchStats(String token) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${AuthViewModel.baseUrl}/referral/stats'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        referralCode = data['referralCode'] ?? '';
        shareLink = data['shareLink'] ?? '';
        shareMessage = data['shareMessage'] ??
            'Join Home Faciliti! Register using my referral link: $shareLink or use code: $referralCode';

        final wallet = data['wallet'] as Map<String, dynamic>? ?? {};
        availableWallet = (wallet['available'] ?? 0).toDouble();
        lockedWallet = (wallet['locked'] ?? 0).toDouble();
        totalWallet = (wallet['total'] ?? 0).toDouble();

        final earn = data['earnings'] as Map<String, dynamic>? ?? {};
        orderBonusTotal = (earn['orderBonus'] ?? 0).toDouble();
        referralBonusTotal = (earn['referralBonus'] ?? 0).toDouble();
        lockedTotal = (earn['locked'] ?? 0).toDouble();
        grandTotal = (earn['total'] ?? 0).toDouble();

        referralCount = data['referralCount'] ?? 0;
        final rawList = data['referrals'] as List<dynamic>? ?? [];
        referrals = rawList
            .map((e) => ReferralEntry.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        error = 'Failed to load referral stats';
      }
    } catch (e) {
      error = 'Network error: $e';
    }

    isLoading = false;
    notifyListeners();
  }

  Future<void> fetchHistory(String token, {bool reset = false}) async {
    if (reset) {
      historyPage = 1;
      history = [];
      hasMoreHistory = true;
    }
    if (!hasMoreHistory) return;

    isLoadingHistory = true;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(
            '${AuthViewModel.baseUrl}/referral/history?page=$historyPage&limit=20'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        historyTotal = data['total'] ?? 0;
        final rawList = data['history'] as List<dynamic>? ?? [];
        final newItems = rawList
            .map((e) => ReferralHistoryItem.fromJson(e as Map<String, dynamic>))
            .toList();
        history.addAll(newItems);
        hasMoreHistory = history.length < historyTotal;
        historyPage++;
      }
    } catch (e) {
      // silently fail on history load
    }

    isLoadingHistory = false;
    notifyListeners();
  }

  Future<bool> validateCode(String code) async {
    try {
      final response = await http.post(
        Uri.parse('${AuthViewModel.baseUrl}/referral/validate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'referralCode': code}),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
