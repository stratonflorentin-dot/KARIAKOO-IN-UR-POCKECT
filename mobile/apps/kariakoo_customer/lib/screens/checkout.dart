import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../state/cart.dart';

/// Checkout preview. Payments and order creation are the next backend phase,
/// so "Place order" honestly confirms a preview and charges nothing yet.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _address = TextEditingController();
  String _payment = 'mpesa';

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  void _placeOrder() {
    if (_address.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a delivery address.')),
      );
      return;
    }
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Almost there'),
        content: const Text(
          'Ordering and mobile-money payments are the next backend phase. '
          'Nothing was charged — this is a preview of checkout.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              ref.read(cartProvider.notifier).clear();
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final total = ref.watch(cartTotalProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Delivery address', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: _address,
            maxLines: 2,
            decoration: const InputDecoration(hintText: 'Street, area, city'),
          ),
          const SizedBox(height: 24),
          const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          _PaymentOption(value: 'mpesa', group: _payment, label: 'M-Pesa', onChanged: _setPayment),
          _PaymentOption(value: 'airtel', group: _payment, label: 'Airtel Money', onChanged: _setPayment),
          _PaymentOption(value: 'tigo', group: _payment, label: 'Mixx by Yas (Tigo)', onChanged: _setPayment),
          const SizedBox(height: 16),
          const Divider(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total to pay', style: TextStyle(color: AppColors.muted)),
              Text(formatTzs(total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(onPressed: _placeOrder, child: const Text('Place order')),
        ),
      ),
    );
  }

  void _setPayment(String? v) {
    if (v != null) setState(() => _payment = v);
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({required this.value, required this.group, required this.label, required this.onChanged});
  final String value;
  final String group;
  final String label;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return RadioListTile<String>(
      value: value,
      groupValue: group,
      onChanged: onChanged,
      title: Text(label),
      contentPadding: EdgeInsets.zero,
    );
  }
}
