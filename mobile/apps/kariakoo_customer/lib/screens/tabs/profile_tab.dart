import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

class ProfileTab extends ConsumerWidget {
  const ProfileTab({super.key, required this.session});
  final AppSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.brand100,
                child: Text(
                  session.displayName.isNotEmpty ? session.displayName[0].toUpperCase() : '?',
                  style: const TextStyle(color: AppColors.brand800, fontWeight: FontWeight.w800, fontSize: 22),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(session.displayName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    if (session.email != null)
                      Text(session.email!, style: const TextStyle(color: AppColors.muted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Your roles', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: session.roles
                .map((r) => Chip(
                      label: Text(r.label),
                      backgroundColor: AppColors.brand50,
                      side: const BorderSide(color: AppColors.line),
                    ))
                .toList(),
          ),
          const SizedBox(height: 28),
          OutlinedButton.icon(
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ],
      ),
    );
  }
}
