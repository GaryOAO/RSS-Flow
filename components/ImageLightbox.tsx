import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Download, Share2 } from 'lucide-react';
import { Share } from '@capacitor/share';

interface Props {
    src: string | null;
    alt?: string;
    onClose: () => void;
    isEInk?: boolean;
}

export const ImageLightbox: React.FC<Props> = ({ src, alt, onClose, isEInk }) => {
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);

    // Use refs for mutable state to avoid re-renders during drag
    const position = useRef({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (src) {
            setScale(1);
            position.current = { x: 0, y: 0 };
            if (imgRef.current) {
                imgRef.current.style.transform = `scale(1) translate(0px, 0px)`;
            }
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [src]);

    // Update transform when scale changes
    useEffect(() => {
        if (imgRef.current && src) {
            const x = position.current.x / scale;
            const y = position.current.y / scale;
            imgRef.current.style.transform = `scale(${scale}) translate(${x}px, ${y}px)`;
        }
    }, [scale, src]);

    if (!src) return null;

    const updateTransform = () => {
        if (imgRef.current) {
            const x = position.current.x / scale;
            const y = position.current.y / scale;
            imgRef.current.style.transform = `scale(${scale}) translate(${x}px, ${y}px)`;
        }
    };

    const handleZoomToggle = () => {
        if (scale > 1) {
            setScale(1);
            position.current = { x: 0, y: 0 };
        } else {
            setScale(2.5);
        }
    };

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (scale === 1) return;
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startPos.current = {
            x: clientX - position.current.x,
            y: clientY - position.current.y
        };
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging || scale === 1) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        position.current = {
            x: clientX - startPos.current.x,
            y: clientY - startPos.current.y
        };

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateTransform);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                title: alt || 'Image',
                url: src,
                dialogTitle: 'Share Image'
            });
        } catch (e) {
            console.error('Share failed', e);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200 ${isEInk ? 'bg-white' : 'bg-black/95 backdrop-blur-sm'}`}
            onClick={onClose}
        >
            {/* Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+var(--safe-top))] flex justify-between items-center z-10" onClick={e => e.stopPropagation()}>
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full ${isEInk ? 'bg-white border-2 border-black text-black' : 'bg-black/50 text-white hover:bg-white/20'}`}
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleZoomToggle}
                        className={`p-2 rounded-full ${isEInk ? 'bg-white border-2 border-black text-black' : 'bg-black/50 text-white hover:bg-white/20'}`}
                    >
                        {scale > 1 ? <ZoomOut size={24} /> : <ZoomIn size={24} />}
                    </button>
                    <button
                        onClick={handleShare}
                        className={`p-2 rounded-full ${isEInk ? 'bg-white border-2 border-black text-black' : 'bg-black/50 text-white hover:bg-white/20'}`}
                    >
                        <Share2 size={24} />
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div
                className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onClick={e => e.stopPropagation()}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt || ''}
                    className={`max-w-full max-h-full object-contain ${isDragging ? '' : 'transition-transform duration-200'} ${isEInk ? 'filter grayscale contrast-125' : ''}`}
                    style={{
                        cursor: scale > 1 ? 'grab' : 'zoom-in',
                        willChange: 'transform'
                    }}
                    onClick={handleZoomToggle}
                    draggable={false}
                />
            </div>

            {/* Caption */}
            {alt && (
                <div className={`absolute bottom-8 left-0 right-0 text-center px-4 pointer-events-none ${isEInk ? 'text-black font-bold' : 'text-white/80'}`}>
                    <p className="text-sm bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-md">
                        {alt}
                    </p>
                </div>
            )}
        </div>
    );
};
