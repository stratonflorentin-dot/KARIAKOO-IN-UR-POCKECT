import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// The seller's advertising: post statuses, teasers and branding that customers
/// see in the app, and manage/remove them.
class SellerPromotionsScreen extends ConsumerWidget {
  const SellerPromotionsScreen({super.key, required this.shop});
  final Shop shop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final promos = ref.watch(myPromotionsProvider(shop.id));
    return Scaffold(
      appBar: AppBar(title: const Text('Advertise your shop')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateSheet(context, ref, shop),
        icon: const Icon(Icons.campaign),
        label: const Text('New post'),
      ),
      body: promos.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Could not load your posts.')),
        data: (list) => list.isEmpty
            ? const _Empty()
            : RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(myPromotionsProvider(shop.id));
                  await ref.read(myPromotionsProvider(shop.id).future);
                },
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) => _PromoCard(
                    promo: list[i],
                    onDelete: () async {
                      await ref.read(promotionsRepositoryProvider).deletePromotion(list[i].id);
                      ref.invalidate(myPromotionsProvider(shop.id));
                    },
                  ),
                ),
              ),
      ),
    );
  }
}

class _PromoCard extends StatelessWidget {
  const _PromoCard({required this.promo, required this.onDelete});
  final ShopPromotion promo;
  final Future<void> Function() onDelete;

  @override
  Widget build(BuildContext context) {
    final expired = promo.expiresAt != null && promo.expiresAt!.isBefore(DateTime.now());
    return Opacity(
      opacity: expired ? 0.5 : 1,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(999)),
                  child: Text(promo.kindLabel, style: const TextStyle(fontSize: 11, color: AppColors.brand800, fontWeight: FontWeight.w600)),
                ),
                const Spacer(),
                if (expired) const Text('Expired', style: TextStyle(fontSize: 11, color: AppColors.muted)),
                IconButton(
                  onPressed: () => onDelete(),
                  icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.danger),
                  tooltip: 'Delete',
                ),
              ],
            ),
            if (promo.imageUrl != null) ...[
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(promo.imageUrl!, height: 140, width: double.infinity, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink()),
              ),
            ],
            if ((promo.title ?? '').isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(promo.title!, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
            if ((promo.body ?? '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(promo.body!, style: const TextStyle(color: AppColors.muted)),
            ],
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.campaign_outlined, size: 48, color: AppColors.muted),
              SizedBox(height: 12),
              Text('No posts yet', style: TextStyle(fontWeight: FontWeight.w700)),
              SizedBox(height: 6),
              Text('Post a status, tease an upcoming product, or show your branding — customers see it in the app.',
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted)),
            ],
          ),
        ),
      );
}

Future<void> _showCreateSheet(BuildContext context, WidgetRef ref, Shop shop) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: _CreatePromoForm(shop: shop),
    ),
  );
}

class _CreatePromoForm extends ConsumerStatefulWidget {
  const _CreatePromoForm({required this.shop});
  final Shop shop;
  @override
  ConsumerState<_CreatePromoForm> createState() => _CreatePromoFormState();
}

class _CreatePromoFormState extends ConsumerState<_CreatePromoForm> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _image = TextEditingController();
  String _kind = 'status';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _image.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    final body = _body.text.trim();
    final image = _image.text.trim();
    if (title.isEmpty && body.isEmpty && image.isEmpty) {
      setState(() => _error = 'Add a title, a message or an image.');
      return;
    }
    if (image.isNotEmpty && !image.startsWith('https://')) {
      setState(() => _error = 'Image link must start with https://');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(promotionsRepositoryProvider).createPromotion(
            shopId: widget.shop.id,
            kind: _kind,
            title: title.isEmpty ? null : title,
            body: body.isEmpty ? null : body,
            imageUrl: image.isEmpty ? null : image,
            // Statuses fade after a day; teasers/branding stay until removed.
            expiresAt: _kind == 'status' ? DateTime.now().add(const Duration(hours: 24)) : null,
          );
      ref.invalidate(myPromotionsProvider(widget.shop.id));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = 'Could not post. ${e.toString().replaceFirst('Exception: ', '')}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('New advert', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'status', label: Text('Status'), icon: Icon(Icons.bolt)),
              ButtonSegment(value: 'teaser', label: Text('Coming soon'), icon: Icon(Icons.schedule)),
              ButtonSegment(value: 'branding', label: Text('Branding'), icon: Icon(Icons.storefront)),
            ],
            selected: {_kind},
            onSelectionChanged: (s) => setState(() => _kind = s.first),
          ),
          const SizedBox(height: 12),
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title (optional)')),
          const SizedBox(height: 10),
          TextField(controller: _body, maxLines: 3, decoration: const InputDecoration(labelText: 'Message (optional)')),
          const SizedBox(height: 10),
          TextField(controller: _image, decoration: const InputDecoration(labelText: 'Image link https:// (optional)')),
          if (_kind == 'status')
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Status posts disappear after 24 hours.', style: TextStyle(fontSize: 12, color: AppColors.muted)),
            ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Posting…' : 'Post')),
        ],
      ),
    );
  }
}
