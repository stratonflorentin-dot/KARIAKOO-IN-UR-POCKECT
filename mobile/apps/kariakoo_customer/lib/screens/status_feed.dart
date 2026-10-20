import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// A WhatsApp/TikTok-style row of shop "statuses" for the home screen.
class StatusStrip extends ConsumerWidget {
  const StatusStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final promos = ref.watch(livePromotionsProvider);
    return promos.maybeWhen(
      data: (list) {
        if (list.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('Shop statuses', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            SizedBox(
              height: 96,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, i) => _StatusAvatar(
                  promo: list[i],
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => StatusViewerScreen(promotions: list, initialIndex: i)),
                  ),
                ),
              ),
            ),
          ],
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _StatusAvatar extends StatelessWidget {
  const _StatusAvatar({required this.promo, required this.onTap});
  final ShopPromotion promo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = promo.shopName ?? 'Shop';
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 68,
        child: Column(
          children: [
            Container(
              width: 62,
              height: 62,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(colors: [AppColors.brand500, AppColors.gold400]),
              ),
              child: Container(
                decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.surface),
                padding: const EdgeInsets.all(2),
                child: ClipOval(
                  child: promo.imageUrl != null
                      ? Image.network(promo.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _initial(name))
                      : _initial(name),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _initial(String name) => Container(
        color: AppColors.brand50,
        alignment: Alignment.center,
        child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
            style: const TextStyle(color: AppColors.brand800, fontWeight: FontWeight.w800, fontSize: 22)),
      );
}

/// Full-screen status viewer: tap right to advance, left to go back.
class StatusViewerScreen extends StatefulWidget {
  const StatusViewerScreen({super.key, required this.promotions, required this.initialIndex});
  final List<ShopPromotion> promotions;
  final int initialIndex;

  @override
  State<StatusViewerScreen> createState() => _StatusViewerScreenState();
}

class _StatusViewerScreenState extends State<StatusViewerScreen> {
  late final PageController _controller = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_index < widget.promotions.length - 1) {
      _controller.nextPage(duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    } else {
      Navigator.of(context).pop();
    }
  }

  void _prev() {
    if (_index > 0) {
      _controller.previousPage(duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.night,
      body: GestureDetector(
        onTapUp: (d) {
          if (d.localPosition.dx < MediaQuery.of(context).size.width / 3) {
            _prev();
          } else {
            _next();
          }
        },
        child: SafeArea(
          child: PageView.builder(
            controller: _controller,
            onPageChanged: (i) => setState(() => _index = i),
            itemCount: widget.promotions.length,
            itemBuilder: (context, i) => _StatusPage(promo: widget.promotions[i]),
          ),
        ),
      ),
    );
  }
}

class _StatusPage extends StatelessWidget {
  const _StatusPage({required this.promo});
  final ShopPromotion promo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.gold400,
                child: Text((promo.shopName ?? 'S')[0].toUpperCase(),
                    style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(promo.shopName ?? 'Shop', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    Text(promo.kindLabel, style: const TextStyle(color: Colors.white60, fontSize: 12)),
                  ],
                ),
              ),
              IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close, color: Colors.white)),
            ],
          ),
          Expanded(
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (promo.imageUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(promo.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                      ),
                    if ((promo.title ?? '').isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(promo.title!, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                    ],
                    if ((promo.body ?? '').isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(promo.body!, style: const TextStyle(color: Colors.white70, fontSize: 16, height: 1.4)),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
