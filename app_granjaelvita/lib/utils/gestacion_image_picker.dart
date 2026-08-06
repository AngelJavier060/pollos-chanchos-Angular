import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Elige cámara (foto en vivo) o galería y devuelve el archivo.
Future<XFile?> pickGestacionImage(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Foto de la chancha',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.photo_camera_rounded, color: Color(0xFF003527)),
            title: const Text('Tomar foto ahora'),
            subtitle: const Text('Usar la cámara del dispositivo'),
            onTap: () => Navigator.pop(ctx, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: Color(0xFF003527)),
            title: const Text('Elegir de galería'),
            onTap: () => Navigator.pop(ctx, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
  if (source == null) return null;
  return ImagePicker().pickImage(
    source: source,
    imageQuality: 85,
    preferredCameraDevice: CameraDevice.rear,
  );
}
