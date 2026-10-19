import 'package:flutter/material.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Orders aren't written to the database yet (that's a later backend phase),
/// so for a real signed-in customer this is an honest empty state rather than
/// fake orders.
class OrdersTab extends StatelessWidget {
  const OrdersTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My orders')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.muted),
              SizedBox(height: 12),
              Text('No orders yet', style: TextStyle(fontWeight: FontWeight.w700)),
              SizedBox(height: 6),
              Text(
                'Your orders will appear here once checkout and payments go live.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
