import React from 'react';
import { GuiOrnamentalBorderConfig } from '../../engine/ornamentalBorderPresets';

interface ModularOrnamentalBorderProps {
  borderConfig?: GuiOrnamentalBorderConfig;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  contentClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const ModularOrnamentalBorder: React.FC<ModularOrnamentalBorderProps> = ({
  borderConfig,
  className = '',
  style = {},
  children,
  contentClassName = '',
  onClick
}) => {
  if (!borderConfig || !borderConfig.enabled) {
    return (
      <div className={`relative ${className}`} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  const { corners, edges, tintColor, backgroundColor, backgroundOpacity = 0.85, glowColor, glowBlurPx = 12 } = borderConfig;
  const cornerSize = corners.cornerSizePx || 32;
  const edgeThickness = edges.edgeThicknessPx || 8;
  const cornerOffset = corners.cornerOffsetPx || -1;

  // Determine corner images based on mode
  const isSingleCorner = corners.mode === 'single_rotated';
  const cornerTL = isSingleCorner ? corners.singleCornerImageUrl : (corners.topLeftImageUrl || corners.singleCornerImageUrl);
  const cornerTR = isSingleCorner ? corners.singleCornerImageUrl : (corners.topRightImageUrl || corners.singleCornerImageUrl);
  const cornerBR = isSingleCorner ? corners.singleCornerImageUrl : (corners.bottomRightImageUrl || corners.singleCornerImageUrl);
  const cornerBL = isSingleCorner ? corners.singleCornerImageUrl : (corners.bottomLeftImageUrl || corners.singleCornerImageUrl);

  // Determine edge images based on mode
  const isSingleEdge = edges.mode === 'single_rotated';
  const edgeTop = isSingleEdge ? edges.singleEdgeImageUrl : (edges.topEdgeImageUrl || edges.singleEdgeImageUrl);
  const edgeRight = isSingleEdge ? edges.singleEdgeImageUrl : (edges.rightEdgeImageUrl || edges.singleEdgeImageUrl);
  const edgeBottom = isSingleEdge ? edges.singleEdgeImageUrl : (edges.bottomEdgeImageUrl || edges.singleEdgeImageUrl);
  const edgeLeft = isSingleEdge ? edges.singleEdgeImageUrl : (edges.leftEdgeImageUrl || edges.singleEdgeImageUrl);

  return (
    <div
      onClick={onClick}
      className={`relative select-none ${className}`}
      style={{
        ...style,
        boxShadow: glowColor ? `0 0 ${glowBlurPx}px ${glowColor}` : undefined
      }}
    >
      {/* Background Fill Layer */}
      {backgroundColor && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            backgroundColor,
            opacity: backgroundOpacity
          }}
        />
      )}

      {/* TOP EDGE */}
      {edgeTop && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            top: 0,
            left: `${cornerSize - 4}px`,
            right: `${cornerSize - 4}px`,
            height: `${edgeThickness}px`,
            backgroundImage: `url("${edgeTop}")`,
            backgroundRepeat: edges.repeatMode === 'stretch' ? 'no-repeat' : 'repeat-x',
            backgroundSize: edges.repeatMode === 'stretch' ? '100% 100%' : `auto ${edgeThickness}px`,
            backgroundPosition: 'center top'
          }}
        />
      )}

      {/* BOTTOM EDGE */}
      {edgeBottom && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            bottom: 0,
            left: `${cornerSize - 4}px`,
            right: `${cornerSize - 4}px`,
            height: `${edgeThickness}px`,
            backgroundImage: `url("${edgeBottom}")`,
            backgroundRepeat: edges.repeatMode === 'stretch' ? 'no-repeat' : 'repeat-x',
            backgroundSize: edges.repeatMode === 'stretch' ? '100% 100%' : `auto ${edgeThickness}px`,
            backgroundPosition: 'center bottom',
            transform: isSingleEdge ? 'rotate(180deg)' : undefined
          }}
        />
      )}

      {/* LEFT EDGE */}
      {edgeLeft && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: 0,
            top: `${cornerSize - 4}px`,
            bottom: `${cornerSize - 4}px`,
            width: `${edgeThickness}px`,
            backgroundImage: `url("${edgeLeft}")`,
            backgroundRepeat: edges.repeatMode === 'stretch' ? 'no-repeat' : 'repeat-y',
            backgroundSize: edges.repeatMode === 'stretch' ? '100% 100%' : `${edgeThickness}px auto`,
            backgroundPosition: 'left center',
            transform: isSingleEdge ? 'scaleX(-1)' : undefined
          }}
        />
      )}

      {/* RIGHT EDGE */}
      {edgeRight && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            right: 0,
            top: `${cornerSize - 4}px`,
            bottom: `${cornerSize - 4}px`,
            width: `${edgeThickness}px`,
            backgroundImage: `url("${edgeRight}")`,
            backgroundRepeat: edges.repeatMode === 'stretch' ? 'no-repeat' : 'repeat-y',
            backgroundSize: edges.repeatMode === 'stretch' ? '100% 100%' : `${edgeThickness}px auto`,
            backgroundPosition: 'right center'
          }}
        />
      )}

      {/* CORNER TOP-LEFT (0°) */}
      {cornerTL && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            top: `${cornerOffset}px`,
            left: `${cornerOffset}px`,
            width: `${cornerSize}px`,
            height: `${cornerSize}px`,
            backgroundImage: `url("${cornerTL}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            transform: 'rotate(0deg)'
          }}
        />
      )}

      {/* CORNER TOP-RIGHT (90° in single mode) */}
      {cornerTR && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            top: `${cornerOffset}px`,
            right: `${cornerOffset}px`,
            width: `${cornerSize}px`,
            height: `${cornerSize}px`,
            backgroundImage: `url("${cornerTR}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            transform: isSingleCorner ? 'rotate(90deg)' : undefined
          }}
        />
      )}

      {/* CORNER BOTTOM-RIGHT (180° in single mode) */}
      {cornerBR && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            bottom: `${cornerOffset}px`,
            right: `${cornerOffset}px`,
            width: `${cornerSize}px`,
            height: `${cornerSize}px`,
            backgroundImage: `url("${cornerBR}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            transform: isSingleCorner ? 'rotate(180deg)' : undefined
          }}
        />
      )}

      {/* CORNER BOTTOM-LEFT (270° in single mode) */}
      {cornerBL && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            bottom: `${cornerOffset}px`,
            left: `${cornerOffset}px`,
            width: `${cornerSize}px`,
            height: `${cornerSize}px`,
            backgroundImage: `url("${cornerBL}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            transform: isSingleCorner ? 'rotate(270deg)' : undefined
          }}
        />
      )}

      {/* Content wrapper with inner padding to clear corners */}
      <div
        className={`relative z-15 h-full ${contentClassName}`}
        style={{
          padding: `${Math.max(10, Math.floor(cornerSize * 0.35))}px`
        }}
      >
        {children}
      </div>
    </div>
  );
};
