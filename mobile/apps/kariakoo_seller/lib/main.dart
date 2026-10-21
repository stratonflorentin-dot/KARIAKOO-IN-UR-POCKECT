import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import 'screens/apply_seller.dart';
import 'screens/seller_products.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const ProviderScope(child: SellerApp()));
}

class SellerApp extends StatelessWidget {
  const SellerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KARIAKOO Seller',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: AuthGate(
        appName: 'Seller',
        home: (context, session) => SellerEntry(session: session),
      ),
    );
  }
}

/// Routes a signed-in user: an approved seller with a shop goes to the products
/// portal; anyone else sees the "not a seller yet" placeholder.
class SellerEntry extends ConsumerWidget {
  const SellerEntry({super.key, required this.session});
  final AppSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!session.hasRole(AppRole.seller)) return SellerHome(session: session);
    final shop = ref.watch(myShopProvider);
    return shop.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) => Scaffold(
        body: RetryPanel(
          message: 'Could not load your shop details.',
          onRetry: () => ref.invalidate(myShopProvider),
        ),
      ),
      data: (s) => s == null
          ? SellerHome(session: session)
          : SellerProductsScreen(session: session, shop: s),
    );
  }
}

class SellerHome extends ConsumerWidget {
  const SellerHome({super.key, required this.session});
  final AppSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSeller = session.hasRole(AppRole.seller);
    return Scaffold(
      appBar: AppBar(
        title: const Text('KARIAKOO Seller',
            style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.storefront, size: 56, color: AppColors.brand600),
              const SizedBox(height: 16),
              Text('Karibu, ${session.displayName}',
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text(
                'Sell to Kariakoo shoppers. Open a shop, get approved, then manage your products and orders.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted),
              ),
              if (!isSeller) ...[
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => const SellerApplyScreen())),
                  child: const Text('Open a shop'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
