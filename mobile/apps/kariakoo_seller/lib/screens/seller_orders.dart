import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Seller order inbox and settlement overview backed by seller-only RPCs.
class SellerOrdersScreen extends ConsumerStatefulWidget {
  const SellerOrdersScreen({super.key, required this.shop});
  final Shop shop;

  @override
  ConsumerState<SellerOrdersScreen> createState() => _SellerOrdersScreenState();
}

class _SellerOrdersScreenState extends ConsumerState<SellerOrdersScreen> {
  bool _updating = false;

  Future<void> _update(SellerOrder order, String status) async {
    String? reason;
    if (status == 'rejected') {
      reason = await _rejectionReason();
      if (reason == null || !mounted) return;
    }
    setState(() => _updating = true);
    try {
      await ref.read(sellerRepositoryProvider).updateFulfillment(
            orderId: order.orderId,
            status: status,
            reason: reason,
          );
      ref.invalidate(sellerOrdersProvider(widget.shop.id));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order ${order.reference} updated.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ));
      }
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<String?> _rejectionReason() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Decline this order?'),
        content: TextField(
          controller: controller,
          minLines: 2,
          maxLines: 4,
          maxLength: 250,
          decoration: const InputDecoration(
            labelText: 'Reason (at least 3 characters)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.length >= 3) Navigator.pop(context, value);
            },
            child: const Text('Decline order'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(sellerOrdersProvider(widget.shop.id));
    return Scaffold(
      appBar: AppBar(title: const Text('Orders & settlements')),
      body: orders.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => RetryPanel(
          message: 'Could not load shop orders.',
          onRetry: () => ref.invalidate(sellerOrdersProvider(widget.shop.id)),
        ),
        data: (items) {
          final pending = items
              .where((order) => order.settlementStatus == 'pending')
              .fold<int>(0, (sum, order) => sum + order.expectedPayoutTzs);
          final settled = items
              .where((order) => order.settlementStatus == 'settled')
              .fold<int>(0, (sum, order) => sum + order.expectedPayoutTzs);
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(sellerOrdersProvider(widget.shop.id));
              await ref.read(sellerOrdersProvider(widget.shop.id).future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  Expanded(
                    child: _SummaryCard(
                      title: 'Awaiting settlement',
                      amount: pending,
                      icon: Icons.account_balance_wallet_outlined,
                      color: AppColors.warning,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SummaryCard(
                      title: 'Settled',
                      amount: settled,
                      icon: Icons.check_circle_outline,
                      color: AppColors.brand700,
                    ),
                  ),
                ]),
                const SizedBox(height: 18),
                const Text('Shop orders',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
                if (items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(child: Text('No orders for this shop yet.')),
                  )
                else
                  for (final order in items)
                    _SellerOrderCard(
                      order: order,
                      updating: _updating,
                      onUpdate: (status) => _update(order, status),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.amount,
    required this.icon,
    required this.color,
  });
  final String title;
  final int amount;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.line),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: color),
          const SizedBox(height: 8),
          Text(title,
              style: const TextStyle(fontSize: 12, color: AppColors.muted)),
          const SizedBox(height: 3),
          Text(formatTzs(amount),
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ]),
      );
}

class _SellerOrderCard extends StatelessWidget {
  const _SellerOrderCard({
    required this.order,
    required this.updating,
    required this.onUpdate,
  });
  final SellerOrder order;
  final bool updating;
  final ValueChanged<String> onUpdate;

  @override
  Widget build(BuildContext context) {
    final (statusLabel, statusColor) = switch (order.fulfillmentStatus) {
      'awaiting_seller' => ('Needs response', AppColors.warning),
      'accepted' => ('Accepted', AppColors.brand700),
      'preparing' => ('Preparing', AppColors.brand600),
      'ready_for_pickup' => ('Ready for pickup', AppColors.brand700),
      'rejected' => ('Declined', AppColors.danger),
      _ => (order.fulfillmentStatus.replaceAll('_', ' '), AppColors.muted),
    };
    final action = switch (order.fulfillmentStatus) {
      'awaiting_seller' => ('Accept order', 'accepted'),
      'accepted' => ('Start preparing', 'preparing'),
      'preparing' => ('Ready for pickup', 'ready_for_pickup'),
      _ => (null, null),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.line),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(order.reference,
                style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          Chip(
            label: Text(statusLabel),
            visualDensity: VisualDensity.compact,
            side: BorderSide.none,
            backgroundColor: statusColor.withValues(alpha: .12),
            labelStyle:
                TextStyle(color: statusColor, fontWeight: FontWeight.w700),
          ),
        ]),
        Text(
          '${order.placedAt.day}/${order.placedAt.month}/${order.placedAt.year} · ${order.zone}',
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        const Divider(height: 20),
        for (final item in order.items)
          Padding(
            padding: const EdgeInsets.only(bottom: 5),
            child: Row(children: [
              Expanded(child: Text('${item.quantity} × ${item.productName}')),
              Text(formatTzs(item.totalTzs)),
            ]),
          ),
        const Divider(height: 20),
        _amountRow('Items', order.merchandiseTzs),
        _amountRow('Commission', order.commissionTzs, prefix: '−'),
        _amountRow('Expected shop payout', order.expectedPayoutTzs, bold: true),
        const SizedBox(height: 4),
        Text(
          'Payment: ${order.paymentStatus}  ·  Settlement: ${order.settlementStatus.replaceAll('_', ' ')}',
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        if (action.$1 != null) ...[
          const SizedBox(height: 10),
          Row(children: [
            if (order.fulfillmentStatus == 'awaiting_seller')
              Expanded(
                child: OutlinedButton(
                  onPressed: updating ? null : () => onUpdate('rejected'),
                  child: const Text('Decline'),
                ),
              ),
            if (order.fulfillmentStatus == 'awaiting_seller')
              const SizedBox(width: 8),
            Expanded(
              child: FilledButton(
                onPressed: updating ? null : () => onUpdate(action.$2!),
                child: Text(action.$1!),
              ),
            ),
          ]),
        ],
      ]),
    );
  }

  Widget _amountRow(String label, int amount,
          {bool bold = false, String prefix = ''}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                    color: bold ? AppColors.ink : AppColors.muted,
                    fontWeight: bold ? FontWeight.w700 : FontWeight.normal)),
          ),
          Text('$prefix${formatTzs(amount)}',
              style: TextStyle(fontWeight: bold ? FontWeight.w800 : null)),
        ]),
      );
}
