import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import '../state/cart.dart';

const List<(String, String)> _zones = [
  ('kariakoo', 'Kariakoo & City Centre'),
  ('ilala', 'Ilala'),
  ('kinondoni', 'Kinondoni (Mwenge, Sinza)'),
  ('ubungo', 'Ubungo (Mbezi, Kimara)'),
  ('temeke', 'Temeke (Mbagala)'),
  ('kigamboni', 'Kigamboni'),
];

int _feeFor(String zone) => switch (zone) {
      'kariakoo' => 2000,
      'ilala' => 2500,
      'kinondoni' => 3500,
      'ubungo' => 4000,
      'temeke' => 4000,
      'kigamboni' => 5000,
      _ => 3000,
    };

/// Checkout: pick a zone + address + payment method, then place the order via
/// the server's place_order (which computes the real prices and PIN).
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _address = TextEditingController();
  String _zone = 'kariakoo';
  String _payment = 'mpesa';
  bool _busy = false;
  // Stable per attempt, so a retry is idempotent on the server.
  late final String _idemKey = DateTime.now().microsecondsSinceEpoch.toString();

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final cart = ref.read(cartProvider);
    if (cart.isEmpty) {
      _snack('Your cart is empty.');
      return;
    }
    if (_address.text.trim().isEmpty) {
      _snack('Please enter a delivery address.');
      return;
    }
    setState(() => _busy = true);
    try {
      final items = [for (final l in cart) {'product_id': l.product.id, 'quantity': l.quantity}];
      final res = await ref.read(ordersRepositoryProvider).placeOrder(
            items: items,
            zone: _zone,
            address: _address.text.trim(),
            paymentMethod: _payment,
            idempotencyKey: _idemKey,
          );
      ref.read(cartProvider.notifier).clear();
      ref.invalidate(myOrdersProvider);
      if (mounted) await _showPlaced(res);
    } catch (e) {
      _snack('Could not place the order: ${e.toString().replaceFirst('Exception: ', '')}');
      setState(() => _busy = false);
    }
  }

  Future<void> _showPlaced(Map<String, dynamic> res) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text('Order ${res['reference'] ?? ''} placed'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('A rider will be assigned. Pay cash or mobile money on delivery.'),
            if (res['pin'] != null) ...[
              const SizedBox(height: 14),
              const Text('Your delivery PIN', style: TextStyle(color: AppColors.muted, fontSize: 12)),
              Text('${res['pin']}',
                  style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: 6, color: AppColors.brand700)),
              const Text('Give this to the rider only when you receive your goods.', style: TextStyle(fontSize: 12, color: AppColors.muted)),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  void _snack(String m) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  Widget build(BuildContext context) {
    final merch = ref.watch(cartTotalProvider);
    final fee = _feeFor(_zone);
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Deliver to', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _zone,
            items: [for (final z in _zones) DropdownMenuItem(value: z.$1, child: Text(z.$2))],
            onChanged: (v) => setState(() => _zone = v ?? 'kariakoo'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _address,
            maxLines: 2,
            decoration: const InputDecoration(hintText: 'Street, area, landmark'),
          ),
          const SizedBox(height: 24),
          const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          RadioGroup<String>(
            groupValue: _payment,
            onChanged: (v) => setState(() => _payment = v ?? 'mpesa'),
            child: const Column(
              children: [
                _PaymentOption(value: 'mpesa', label: 'M-Pesa'),
                _PaymentOption(value: 'airtel', label: 'Airtel Money'),
                _PaymentOption(value: 'tigo', label: 'Mixx by Yas (Tigo)'),
                _PaymentOption(value: 'cod', label: 'Cash on delivery'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Divider(),
          _row('Items', formatTzs(merch)),
          _row('Delivery fee', formatTzs(fee)),
          const SizedBox(height: 4),
          _row('Total', formatTzs(merch + fee), bold: true),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _busy ? null : _placeOrder,
            child: Text(_busy ? 'Placing…' : 'Place order'),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    final style = TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w400, fontSize: bold ? 18 : 14);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label, style: TextStyle(color: bold ? AppColors.ink : AppColors.muted)), Text(value, style: style)],
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) {
    return RadioListTile<String>(value: value, title: Text(label), contentPadding: EdgeInsets.zero);
  }
}
