import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Order tracking: delivery progress, the PIN, items and totals.
class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen(
      {super.key, required this.orderId, required this.reference});
  final String orderId;
  final String reference;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(orderDetailProvider(orderId));
    return Scaffold(
      appBar: AppBar(title: Text('Order $reference')),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => RetryPanel(
          message: 'Could not load this order.',
          onRetry: () => ref.invalidate(orderDetailProvider(orderId)),
        ),
        data: (d) => d == null
            ? const Center(child: Text('Order not found.'))
            : RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(orderDetailProvider(orderId));
                  await ref.read(orderDetailProvider(orderId).future);
                },
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _ProgressStrip(deliveryStatus: d.deliveryStatus),
                    const SizedBox(height: 16),
                    if (d.pin != null && d.deliveryStatus != 'DELIVERED')
                      _PinCard(pin: d.pin!),
                    _Card(
                      title: 'Items',
                      child: Column(
                        children: [
                          for (final it in d.items)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  Expanded(
                                      child: Text(
                                          '${it.quantity} × ${it.productName}')),
                                  Text(formatTzs(it.lineTotalTzs)),
                                ],
                              ),
                            ),
                          const Divider(),
                          _row('Items', formatTzs(d.merchandiseTzs)),
                          _row('Delivery fee',
                              formatTzs(d.order.deliveryFeeTzs)),
                          _row('Total', formatTzs(d.totalTzs), bold: true),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

const List<(String, String)> _steps = [
  ('ASSIGNED', 'Confirmed'),
  ('ACCEPTED', 'Rider assigned'),
  ('PICKED_UP', 'Picked up'),
  ('IN_TRANSIT', 'On the way'),
  ('DELIVERED', 'Delivered'),
];

class _ProgressStrip extends StatelessWidget {
  const _ProgressStrip({required this.deliveryStatus});
  final String deliveryStatus;

  @override
  Widget build(BuildContext context) {
    final order = [
      'PENDING_ASSIGNMENT',
      'ASSIGNED',
      'ACCEPTED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED'
    ];
    final current = order.indexOf(deliveryStatus);
    return _Card(
      title: 'Delivery',
      child: Column(
        children: [
          for (var i = 0; i < _steps.length; i++)
            _StepRow(
              label: _steps[i].$2,
              done: order.indexOf(_steps[i].$1) <= current,
              last: i == _steps.length - 1,
            ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.label, required this.done, required this.last});
  final String label;
  final bool done;
  final bool last;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Icon(done ? Icons.check_circle : Icons.radio_button_unchecked,
                size: 20, color: done ? AppColors.brand600 : AppColors.line),
            if (!last)
              Container(
                  width: 2,
                  height: 22,
                  color: done ? AppColors.brand500 : AppColors.line),
          ],
        ),
        const SizedBox(width: 12),
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Text(label,
              style: TextStyle(
                  fontWeight: done ? FontWeight.w600 : FontWeight.w400,
                  color: done ? AppColors.ink : AppColors.muted)),
        ),
      ],
    );
  }
}

class _PinCard extends StatelessWidget {
  const _PinCard({required this.pin});
  final String pin;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppColors.night, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery PIN — give it to the rider on hand-over',
              style: TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 4),
          Text(pin,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 8)),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child});
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.line)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

Widget _row(String label, String value, {bool bold = false}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                color: bold ? AppColors.ink : AppColors.muted,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
        Text(value,
            style: TextStyle(
                fontWeight: bold ? FontWeight.w800 : FontWeight.w400)),
      ],
    ),
  );
}
