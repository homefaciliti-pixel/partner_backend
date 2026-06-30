import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../ViewModel/referral/referral_viewmodel.dart';
import '../../ViewModel/auth/auth_viewmodel.dart';

class ReferAndEarnScreen extends StatefulWidget {
  const ReferAndEarnScreen({super.key});

  @override
  State<ReferAndEarnScreen> createState() => _ReferAndEarnScreenState();
}

class _ReferAndEarnScreenState extends State<ReferAndEarnScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final token =
          Provider.of<AuthViewModel>(context, listen: false).token ?? '';
      final vm = Provider.of<ReferralViewModel>(context, listen: false);
      vm.fetchStats(token);
      vm.fetchHistory(token, reset: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _copyCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Referral code copied!'),
        backgroundColor: const Color(0xFF0B5FA5),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _shareCode(String message) {
    Share.share(message, subject: 'Join Home Faciliti Partner App!');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6FA),
      appBar: AppBar(
        title: const Text(
          'Refer & Earn',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF0B5FA5),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.amber,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'My Referrals'),
            Tab(text: 'Earnings History'),
          ],
        ),
      ),
      body: Consumer<ReferralViewModel>(
        builder: (context, vm, _) {
          if (vm.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF0B5FA5)),
            );
          }
          if (vm.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 60, color: Colors.red),
                  const SizedBox(height: 12),
                  Text(vm.error!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      final token =
                          Provider.of<AuthViewModel>(context, listen: false)
                              .token ??
                              '';
                      vm.fetchStats(token);
                    },
                    child: const Text('Retry'),
                  )
                ],
              ),
            );
          }

          return TabBarView(
            controller: _tabController,
            children: [
              _buildReferralsTab(vm),
              _buildHistoryTab(vm),
            ],
          );
        },
      ),
    );
  }

  // ─────────────────────────────────────────────────
  // TAB 1: My Referrals
  // ─────────────────────────────────────────────────
  Widget _buildReferralsTab(ReferralViewModel vm) {
    return ListView(
      padding: const EdgeInsets.all(0),
      children: [
        // === REFERRAL CODE HERO CARD ===
        _buildHeroCard(vm),

        // === HOW IT WORKS ===
        _buildHowItWorks(),

        // === WALLET SUMMARY ===
        _buildWalletSummary(vm),

        // === MY REFERRALS LIST ===
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Text(
            'My Referrals (${vm.referralCount})',
            style: const TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0B5FA5)),
          ),
        ),

        if (vm.referrals.isEmpty)
          _buildEmptyReferrals()
        else
          ...vm.referrals.map((r) => _buildReferralCard(r)),

        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildHeroCard(ReferralViewModel vm) {
    return Container(
      margin: const EdgeInsets.all(0),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0B5FA5), Color(0xFF1976D2), Color(0xFF42A5F5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Gift icon + headline
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.card_giftcard, color: Colors.amber, size: 32),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Invite & Earn ₹500+',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Refer a partner & earn ₹50 on every order they complete!',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Referral code box
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Your Referral Code',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        vm.referralCode.isEmpty ? 'Loading...' : vm.referralCode,
                        style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0B5FA5),
                            letterSpacing: 3),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => _copyCode(vm.referralCode),
                        icon: const Icon(Icons.copy, color: Color(0xFF0B5FA5)),
                        tooltip: 'Copy code',
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Share button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: vm.shareMessage.isEmpty
                    ? null
                    : () => _shareCode(vm.shareMessage),
                icon: const Icon(Icons.share, color: Colors.white),
                label: const Text(
                  'Share on WhatsApp / SMS',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHowItWorks() {
    const steps = [
      ('1', 'Share Code', 'Share your referral code with another partner', Icons.share, Colors.blue),
      ('2', 'They Register', 'They register using your code & get approved', Icons.person_add, Colors.purple),
      ('3', '₹500 Locked', '₹500 is added to your wallet (locked)', Icons.lock, Colors.orange),
      ('4', '5 Orders in 5 Days', 'They complete 5 orders within 5 days', Icons.check_circle, Colors.teal),
      ('5', '₹500 Unlocked!', 'Your ₹500 unlocks & ₹50 per order too!', Icons.lock_open, Colors.green),
    ];

    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🎯 How it Works',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...steps.map((s) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: s.$5.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(s.$4, size: 18, color: s.$5),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Step ${s.$1}: ${s.$2}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                          Text(
                            s.$3,
                            style: const TextStyle(
                                fontSize: 11, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
          const Divider(height: 20),
          const Text(
            '⚠️ Rules',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          _ruleRow('₹500 referral reward will be LOCKED initially'),
          _ruleRow('Unlocks only when referred partner completes 5 orders in 5 days'),
          _ruleRow('₹50 per order is directly withdrawable (Level 1)'),
          _ruleRow('₹20 per order for Level 2 indirect referrals'),
          _ruleRow('If 5 orders not completed in 5 days, ₹500 expires'),
          _ruleRow('Self-referral is NOT allowed'),
        ],
      ),
    );
  }

  Widget _ruleRow(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(color: Colors.red)),
          Expanded(
              child: Text(text,
                  style: const TextStyle(fontSize: 11, color: Colors.black87))),
        ],
      ),
    );
  }

  Widget _buildWalletSummary(ReferralViewModel vm) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFFFFF9C4), Color(0xFFFFF3E0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.amber.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '💰 Referral Wallet',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _walletChip('Available', vm.availableWallet, Colors.green),
              _walletChip('Locked', vm.lockedWallet, Colors.orange),
              _walletChip('Total Earned', vm.grandTotal, const Color(0xFF0B5FA5)),
            ],
          ),
          if (vm.orderBonusTotal > 0 || vm.referralBonusTotal > 0) ...[
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order Bonus: ₹${vm.orderBonusTotal.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 11, color: Colors.teal),
                ),
                Text(
                  'Referral Bonus: ₹${vm.referralBonusTotal.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 11, color: Colors.purple),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _walletChip(String label, double amount, Color color) {
    return Column(
      children: [
        Text(
          '₹${amount.toStringAsFixed(0)}',
          style: TextStyle(
              fontSize: 18, fontWeight: FontWeight.bold, color: color),
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }

  Widget _buildEmptyReferrals() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        children: [
          Icon(Icons.group_add_outlined, size: 60, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text(
            'No referrals yet',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            'Share your referral code with other partners and start earning!',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralCard(ReferralEntry r) {
    Color statusColor;
    IconData statusIcon;
    String statusLabel;

    switch (r.status) {
      case 'unlocked':
        statusColor = Colors.green;
        statusIcon = Icons.lock_open;
        statusLabel = 'Unlocked ✓';
        break;
      case 'expired':
        statusColor = Colors.red;
        statusIcon = Icons.timer_off;
        statusLabel = 'Expired';
        break;
      default:
        statusColor = Colors.orange;
        statusIcon = Icons.lock_clock;
        statusLabel = 'Pending';
    }

    final progress = (r.ordersCompleted / r.ordersNeeded).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: const Color(0xFF0B5FA5).withOpacity(0.1),
                radius: 20,
                child: Text(
                  r.partnerName.isNotEmpty ? r.partnerName[0].toUpperCase() : 'P',
                  style: const TextStyle(
                      color: Color(0xFF0B5FA5), fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.partnerName,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    Text(
                      r.phone,
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 12, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      statusLabel,
                      style: TextStyle(
                          fontSize: 11,
                          color: statusColor,
                          fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Progress bar
          Row(
            children: [
              Text(
                '${r.ordersCompleted}/${r.ordersNeeded} Orders',
                style:
                    const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
              ),
              const Spacer(),
              Text(
                r.status == 'unlocked'
                    ? '₹${r.lockedReward.toStringAsFixed(0)} Unlocked!'
                    : r.status == 'expired'
                        ? 'Expired'
                        : '₹${r.lockedReward.toStringAsFixed(0)} Locked',
                style: TextStyle(
                    fontSize: 11,
                    color: statusColor,
                    fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
            ),
          ),

          // Deadline info for pending
          if (r.status == 'pending' && r.unlockDeadline != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.timer_outlined, size: 12, color: Colors.orange),
                const SizedBox(width: 4),
                Text(
                  'Deadline: ${_formatDate(r.unlockDeadline!)}',
                  style: const TextStyle(fontSize: 10, color: Colors.orange),
                ),
              ],
            ),
          ],

          if (r.status == 'unlocked' && r.unlockedAt != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.check_circle, size: 12, color: Colors.green),
                const SizedBox(width: 4),
                Text(
                  'Unlocked on ${_formatDate(r.unlockedAt!)}',
                  style: const TextStyle(fontSize: 10, color: Colors.green),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────
  // TAB 2: Earnings History
  // ─────────────────────────────────────────────────
  Widget _buildHistoryTab(ReferralViewModel vm) {
    final token =
        Provider.of<AuthViewModel>(context, listen: false).token ?? '';

    if (vm.history.isEmpty && !vm.isLoadingHistory) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 60, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            const Text('No earnings yet',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text('Refer partners and start earning!',
                style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: vm.history.length + (vm.hasMoreHistory ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == vm.history.length) {
          // Load more
          if (!vm.isLoadingHistory) {
            vm.fetchHistory(token);
          }
          return const Center(
              child: Padding(
            padding: EdgeInsets.all(16),
            child: CircularProgressIndicator(color: Color(0xFF0B5FA5)),
          ));
        }

        final item = vm.history[index];
        return _buildHistoryItem(item);
      },
    );
  }

  Widget _buildHistoryItem(ReferralHistoryItem item) {
    final isOrderBonus = item.type == 'order_bonus';
    final isAvailable = item.status == 'available';
    final color = isAvailable ? Colors.green : Colors.orange;
    final icon = isOrderBonus ? Icons.shopping_bag : Icons.card_giftcard;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 6,
              offset: const Offset(0, 2))
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.description,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatDate(item.createdAt),
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${item.amount.toStringAsFixed(0)}',
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: color),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  item.status == 'available'
                      ? 'Available'
                      : item.status == 'locked'
                          ? 'Locked'
                          : 'Expired',
                  style: TextStyle(fontSize: 9, color: color),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${dt.day} ${months[dt.month]} ${dt.year}';
  }
}
