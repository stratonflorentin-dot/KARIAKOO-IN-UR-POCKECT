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
          RadioGroup<String>(
            groupValue: _payment,
            onChanged: _setPayment,
            child: const Column(
              children: [
                _PaymentOption(value: 'mpesa', label: 'M-Pesa'),
                _PaymentOption(value: 'airtel', label: 'Airtel Money'),
                _PaymentOption(value: 'tigo', label: 'Mixx by Yas (Tigo)'),
              ],
            ),
          ),
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
  const _PaymentOption({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    // The selected value + onChanged come from the RadioGroup ancestor.
    return RadioListTile<String>(
      value: value,
      title: Text(label),
      contentPadding: EdgeInsets.zero,
    );
  }
}
