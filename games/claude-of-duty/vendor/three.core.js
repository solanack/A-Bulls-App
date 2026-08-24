Warning: truncated output (original token count: 350864)
... 354879 bytes omitted ...

/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
const REVISION = '180';

/**
 * Represents mouse buttons and interaction types in context of controls.
 *
 * @type {ConstantsMouse}
 * @constant
 */
const MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2, ROTATE: 0, DOLLY: 1, PAN: 2 };

/**
 * Represents touch interaction types in context of controls.
 *
 * @type {ConstantsTouch}
 * @constant
 */
const TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 };

/**
 * Disables face culling.
 *
 * @type {number}
 * @constant
 */
const CullFaceNone = 0;

/**
 * Culls back faces.
 *
 * @type {number}
 * @constant
 */
const CullFaceBack = 1;

/**
 * Culls front faces.
 *
 * @type {number}
 * @constant
 */
const CullFaceFront = 2;

/**
 * Culls both front and back faces.
 *
 * @type {number}
 * @constant
 */
const CullFaceFrontBack = 3;

/**
 * Gives unfiltered shadow maps - fastest, but lowest quality.
 *
 * @type {number}
 * @constant
 */
const BasicShadowMap = 0;

/**
 * Filters shadow maps using the Percentage-Closer Filtering (PCF) algorithm.
 *
 * @type {number}
 * @constant
 */
const PCFShadowMap = 1;

/**
 * Filters shadow maps using the Percentage-Closer Filtering (PCF) algorithm with
 * better soft shadows especially when using low-resolution shadow maps.
 *
 * @type {number}
 * @constant
 */
const PCFSoftShadowMap = 2;

/**
 * Filters shadow maps using the Variance Shadow Map (VSM) algorithm.
 * When using VSMShadowMap all shadow receivers will also cast shadows.
 *
 * @type {number}
 * @constant
 */
const VSMShadowMap = 3;

/**
 * Only front faces are rendered.
 *
 * @type {number}
 * @constant
 */
const FrontSide = 0;

/**
 * Only back faces are rendered.
 *
 * @type {number}
 * @constant
 */
const BackSide = 1;

/**
 * Both front and back faces are rendered.
 *
 * @type {number}
 * @constant
 */
const DoubleSide = 2;

/**
 * No blending is performed which effectively disables
 * alpha transparency.
 *
 * @type {number}
 * @constant
 */
const NoBlending = 0;

/**
 * The default blending.
 *
 * @type {number}
 * @constant
 */
const NormalBlending = 1;

/**
 * Represents additive blending.
 *
 * @type {number}
 * @constant
 */
const AdditiveBlending = 2;

/**
 * Represents subtractive blending.
 *
 * @type {number}
 * @constant
 */
const SubtractiveBlending = 3;

/**
 * Represents multiply blending.
 *
 * @type {number}
 * @constant
 */
const MultiplyBlending = 4;

/**
 * Represents custom blending.
 *
 * @type {number}
 * @constant
 */
const CustomBlending = 5;

/**
 * A `source + destination` blending equation.
 *
 * @type {number}
 * @constant
 */
const AddEquation = 100;

/**
 * A `source - destination` blending equation.
 *
 * @type {number}
 * @constant
 */
const SubtractEquation = 101;

/**
 * A `destination - source` blending equation.
 *
 * @type {number}
 * @constant
 */
const ReverseSubtractEquation = 102;

/**
 * A blend equation that uses the minimum of source and destination.
 *
 * @type {number}
 * @constant
 */
const MinEquation = 103;

/**
 * A blend equation that uses the maximum of source and destination.
 *
 * @type {number}
 * @constant
 */
const MaxEquation = 104;

/**
 * Multiplies all colors by `0`.
 *
 * @type {number}
 * @constant
 */
const ZeroFactor = 200;

/**
 * Multiplies all colors by `1`.
 *
 * @type {number}
 * @constant
 */
const OneFactor = 201;

/**
 * Multiplies all colors by the source colors.
 *
 * @type {number}
 * @constant
 */
const SrcColorFactor = 202;

/**
 * Multiplies all colors by `1` minus each source color.
 *
 * @type {number}
 * @constant
 */
const OneMinusSrcColorFactor = 203;

/**
 * Multiplies all colors by the source alpha value.
 *
 * @type {number}
 * @constant
 */
const SrcAlphaFactor = 204;

/**
 * Multiplies all colors by 1 minus the source alpha value.
 *
 * @type {number}
 * @constant
 */
const OneMinusSrcAlphaFactor = 205;

/**
 * Multiplies all colors by the destination alpha value.
 *
 * @type {number}
 * @constant
 */
const DstAlphaFactor = 206;

/**
 * Multiplies all colors by `1` minus the destination alpha value.
 *
 * @type {number}
 * @constant
 */
const OneMinusDstAlphaFactor = 207;

/**
 * Multiplies all colors by the destination color.
 *
 * @type {number}
 * @constant
 */
const DstColorFactor = 208;

/**
 * Multiplies all colors by `1` minus each destination color.
 *
 * @type {number}
 * @constant
 */
const OneMinusDstColorFactor = 209;

/**
 * Multiplies the RGB colors by the smaller of either the source alpha
 * value or the value of `1` minus the destination alpha value. The alpha
 * value is multiplied by `1`.
 *
 * @type {number}
 * @constant
 */
const SrcAlphaSaturateFactor = 210;

/**
 * Multiplies all colors by a constant color.
 *
 * @type {number}
 * @constant
 */
const ConstantColorFactor = 211;

/**
 * Multiplies all colors by `1` minus a constant color.
 *
 * @type {number}
 * @constant
 */
const OneMinusConstantColorFactor = 212;

/**
 * Multiplies all colors by a constant alpha value.
 *
 * @type {number}
 * @constant
 */
const ConstantAlphaFactor = 213;

/**
 * Multiplies all colors by 1 minus a constant alpha value.
 *
 * @type {number}
 * @constant
 */
const OneMinusConstantAlphaFactor = 214;

/**
 * Never pass.
 *
 * @type {number}
 * @constant
 */
const NeverDepth = 0;

/**
 * Always pass.
 *
 * @type {number}
 * @constant
 */
const AlwaysDepth = 1;

/**
 * Pass if the incoming value is less than the depth buffer value.
 *
 * @type {number}
 * @constant
 */
const LessDepth = 2;

/**
 * Pass if the incoming value is less than or equal to the depth buffer value.
 *
 * @type {number}
 * @constant
 */
const LessEqualDepth = 3;

/**
 * Pass if the incoming value equals the depth buffer value.
 *
 * @type {number}
 * @constant
 */
const EqualDepth = 4;

/**
 * Pass if the incoming value is greater than or equal to the depth buffer value.
 *
 * @type {number}
 * @constant
 */
const GreaterEqualDepth = 5;

/**
 * Pass if the incoming value is greater than the depth buffer value.
 *
 * @type {number}
 * @constant
 */
const GreaterDepth = 6;

/**
 * Pass if the incoming value is not equal to the depth buffer value.
 *
 * @type {number}
 * @constant
 */
const NotEqualDepth = 7;

/**
 * Multiplies the environment map color with the surface color.
 *
 * @type {number}
 * @constant
 */
const MultiplyOperation = 0;

/**
 * Uses reflectivity to blend between the two colors.
 *
 * @type {number}
 * @constant
 */
const MixOperation = 1;

/**
 * Adds the two colors.
 *
 * @type {number}
 * @constant
 */
const AddOperation = 2;

/**
 * No tone mapping is applied.
 *
 * @type {number}
 * @constant
 */
const NoToneMapping = 0;

/**
 * Linear tone mapping.
 *
 * @type {number}
 * @constant
 */
const LinearToneMapping = 1;

/**
 * Reinhard tone mapping.
 *
 * @type {number}
 * @constant
 */
const ReinhardToneMapping = 2;

/**
 * Cineon tone mapping.
 *
 * @type {number}
 * @constant
 */
const CineonToneMapping = 3;

/**
 * ACES Filmic tone mapping.
 *
 * @type {number}
 * @constant
 */
const ACESFilmicToneMapping = 4;

/**
 * Custom tone mapping.
 *
 * Expects a custom implementation by modifying shader code of the material's fragment shader.
 *
 * @type {number}
 * @constant
 */
const CustomToneMapping = 5;

/**
 * AgX tone mapping.
 *
 * @type {number}
 * @constant
 */
const AgXToneMapping = 6;

/**
 * Neutral tone mapping.
 *
 * Implementation based on the Khronos 3D Commerce Group standard tone mapping.
 *
 * @type {number}
 * @constant
 */
const NeutralToneMapping = 7;

/**
 * The skinned mesh shares the same world space as the skeleton.
 *
 * @type {string}
 * @constant
 */
const AttachedBindMode = 'attached';

/**
 * The skinned mesh does not share the same world space as the skeleton.
 * This is useful when a skeleton is shared across multiple skinned meshes.
 *
 * @type {string}
 * @constant
 */
const DetachedBindMode = 'detached';

/**
 * Maps textures using the geometry's UV coordinates.
 *
 * @type {number}
 * @constant
 */
const UVMapping = 300;

/**
 * Reflection mapping for cube textures.
 *
 * @type {number}
 * @constant
 */
const CubeReflectionMapping = 301;

/**
 * Refraction mapping for cube textures.
 *
 * @type {number}
 * @constant
 */
const CubeRefractionMapping = 302;

/**
 * Reflection mapping for equirectangular textures.
 *
 * @type {number}
 * @constant
 */
const EquirectangularReflectionMapping = 303;

/**
 * Refraction mapping for equirectangular textures.
 *
 * @type {number}
 * @constant
 */
const EquirectangularRefractionMapping = 304;

/**
 * Reflection mapping for PMREM textures.
 *
 * @type {number}
 * @constant
 */
const CubeUVReflectionMapping = 306;

/**
 * The texture will simply repeat to infinity.
 *
 * @type {number}
 * @constant
 */
const RepeatWrapping = 1000;

/**
 * The last pixel of the texture stretches to the edge of the mesh.
 *
 * @type {number}
 * @constant
 */
const ClampToEdgeWrapping = 1001;

/**
 * The texture will repeats to infinity, mirroring on each repeat.
 *
 * @type {number}
 * @constant
 */
const MirroredRepeatWrapping = 1002;

/**
 * Returns the value of the texture element that is nearest (in Manhattan distance)
 * to the specified texture coordinates.
 *
 * @type {number}
 * @constant
 */
const NearestFilter = 1003;

/**
 * Chooses the mipmap that most closely matches the size of the pixel being textured
 * and uses the `NearestFilter` criterion (the texel nearest to the center of the pixel)
 * to produce a texture value.
 *
 * @type {number}
 * @constant
 */
const NearestMipmapNearestFilter = 1004;
const NearestMipMapNearestFilter = 1004; // legacy

/**
 * Chooses the two mipmaps that most closely match the size of the pixel being textured and
 * uses the `NearestFilter` criterion to produce a texture value from each mipmap.
 * The final texture value is a weighted average of those two values.
 *
 * @type {number}
 * @constant
 */
const NearestMipmapLinearFilter = 1005;
const NearestMipMapLinearFilter = 1005; // legacy

/**
 * Returns the weighted average of the four texture elements that are closest to the specified
 * texture coordinates, and can include items wrapped or repeated from other parts of a texture,
 * depending on the values of `wrapS` and `wrapT`, and on the exact mapping.
 *
 * @type {number}
 * @constant
 */
const LinearFilter = 1006;

/**
 * Chooses the mipmap that most closely matches the size of the pixel being textured and uses
 * the `LinearFilter` criterion (a weighted average of the four texels that are closest to the
 * center of the pixel) to produce a texture value.
 *
 * @type {number}
 * @constant
 */
const LinearMipmapNearestFilter = 1007;
const LinearMipMapNearestFilter = 1007; // legacy

/**
 * Chooses the two mipmaps that most closely match the size of the pixel being textured and uses
 * the `LinearFilter` criterion to produce a texture value from each mipmap. The final texture value
 * is a weighted average of those two values.
 *
 * @type {number}
 * @constant
 */
const LinearMipmapLinearFilter = 1008;
const LinearMipMapLinearFilter = 1008; // legacy

/**
 * An unsigned byte data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedByteType = 1009;

/**
 * A byte data type for textures.
 *
 * @type {number}
 * @constant
 */
const ByteType = 1010;

/**
 * A short data type for textures.
 *
 * @type {number}
 * @constant
 */
const ShortType = 1011;

/**
 * An unsigned short data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedShortType = 1012;

/**
 * An int data type for textures.
 *
 * @type {number}
 * @constant
 */
const IntType = 1013;

/**
 * An unsigned int data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedIntType = 1014;

/**
 * A float data type for textures.
 *
 * @type {number}
 * @constant
 */
const FloatType = 1015;

/**
 * A half float data type for textures.
 *
 * @type {number}
 * @constant
 */
const HalfFloatType = 1016;

/**
 * An unsigned short 4_4_4_4 (packed) data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedShort4444Type = 1017;

/**
 * An unsigned short 5_5_5_1 (packed) data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedShort5551Type = 1018;

/**
 * An unsigned int 24_8 data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedInt248Type = 1020;

/**
 * An unsigned int 5_9_9_9 (packed) data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedInt5999Type = 35902;

/**
 * An unsigned int 10_11_11 (packed) data type for textures.
 *
 * @type {number}
 * @constant
 */
const UnsignedInt101111Type = 35899;

/**
 * Discards the red, green and blue components and reads just the alpha component.
 *
 * @type {number}
 * @constant
 */
const AlphaFormat = 1021;

/**
 * Discards the alpha component and reads the red, green and blue component.
 *
 * @type {number}
 * @constant
 */
const RGBFormat = 1022;

/**
 * Reads the red, green, blue and alpha components.
 *
 * @type {number}
 * @constant
 */
const RGBAFormat = 1023;

/**
 * Reads each element as a single depth value, converts it to floating point, and clamps to the range `[0,1]`.
 *
 * @type {number}
 * @constant
 */
const DepthFormat = 1026;

/**
 * Reads each element is a pair of depth and stencil values. The depth component of the pair is interpreted as
 * in `DepthFormat`. The stencil component is interpreted based on the depth + stencil internal format.
 *
 * @type {number}
 * @constant
 */
const DepthStencilFormat = 1027;

/**
 * Discards the green, blue and alpha components and reads just the red component.
 *
 * @type {number}
 * @constant
 */
const RedFormat = 1028;

/**
 * Discards the green, blue and alpha components and reads just the red component. The texels are read as integers instead of floating point.
 *
 * @type {number}
 * @constant
 */
const RedIntegerFormat = 1029;

/**
 * Discards the alpha, and blue components and reads the red, and green components.
 *
 * @type {number}
 * @constant
 */
const RGFormat = 1030;

/**
 * Discards the alpha, and blue components and reads the red, and green components. The texels are read as integers instead of floating point.
 *
 * @type {number}
 * @constant
 */
const RGIntegerFormat = 1031;

/**
 * Discards the alpha component and reads the red, green and blue component. The texels are read as integers instead of floating point.
 *
 * @type {number}
 * @constant
 */
const RGBIntegerFormat = 1032;

/**
 * Reads the red, green, blue and alpha components. The texels are read as integers instead of floating point.
 *
 * @type {number}
 * @constant
 */
const RGBAIntegerFormat = 1033;

/**
 * A DXT1-compressed image in an RGB image format.
 *
 * @type {number}
 * @constant
 */
const RGB_S3TC_DXT1_Format = 33776;

/**
 * A DXT1-compressed image in an RGB image format with a simple on/off alpha value.
 *
 * @type {number}
 * @constant
 */
const RGBA_S3TC_DXT1_Format = 33777;

/**
 * A DXT3-compressed image in an RGBA image format. Compared to a 32-bit RGBA texture, it offers 4:1 compression.
 *
 * @type {number}
 * @constant
 */
const RGBA_S3TC_DXT3_Format = 33778;

/**
 * A DXT5-compressed image in an RGBA image format. It also provides a 4:1 compression, but differs to the DXT3
 * compression in how the alpha compression is done.
 *
 * @type {number}
 * @constant
 */
const RGBA_S3TC_DXT5_Format = 33779;

/**
 * PVRTC RGB compression in 4-bit mode. One block for each 4×4 pixels.
 *
 * @type {number}
 * @constant
 */
const RGB_PVRTC_4BPPV1_Format = 35840;

/**
 * PVRTC RGB compression in 2-bit mode. One block for each 8×4 pixels.
 *
 * @type {number}
 * @constant
 */
const RGB_PVRTC_2BPPV1_Format = 35841;

/**
 * PVRTC RGBA compression in 4-bit mode. One block for each 4×4 pixels.
 *
 * @type {number}
 * @constant
 */
const RGBA_PVRTC_4BPPV1_Format = 35842;

/**
 * PVRTC RGBA compression in 2-bit mode. One block for each 8×4 pixels.
 *
 * @type {number}
 * @constant
 */
const RGBA_PVRTC_2BPPV1_Format = 35843;

/**
 * ETC1 RGB format.
 *
 * @type {number}
 * @constant
 */
const RGB_ETC1_Format = 36196;

/**
 * ETC2 RGB format.
 *
 * @type {number}
 * @constant
 */
const RGB_ETC2_Format = 37492;

/**
 * ETC2 RGBA format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ETC2_EAC_Format = 37496;

/**
 * ASTC RGBA 4x4 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_4x4_Format = 37808;

/**
 * ASTC RGBA 5x4 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_5x4_Format = 37809;

/**
 * ASTC RGBA 5x5 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_5x5_Format = 37810;

/**
 * ASTC RGBA 6x5 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_6x5_Format = 37811;

/**
 * ASTC RGBA 6x6 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_6x6_Format = 37812;

/**
 * ASTC RGBA 8x5 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_8x5_Format = 37813;

/**
 * ASTC RGBA 8x6 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_8x6_Format = 37814;

/**
 * ASTC RGBA 8x8 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_8x8_Format = 37815;

/**
 * ASTC RGBA 10x5 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_10x5_Format = 37816;

/**
 * ASTC RGBA 10x6 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_10x6_Format = 37817;

/**
 * ASTC RGBA 10x8 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_10x8_Format = 37818;

/**
 * ASTC RGBA 10x10 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_10x10_Format = 37819;

/**
 * ASTC RGBA 12x10 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_12x10_Format = 37820;

/**
 * ASTC RGBA 12x12 format.
 *
 * @type {number}
 * @constant
 */
const RGBA_ASTC_12x12_Format = 37821;

/**
 * BPTC RGBA format.
 *
 * @type {number}
 * @constant
 */
const RGBA_BPTC_Format = 36492;

/**
 * BPTC Signed RGB format.
 *
 * @type {number}
 * @constant
 */
const RGB_BPTC_SIGNED_Format = 36494;

/**
 * BPTC Unsigned RGB format.
 *
 * @type {number}
 * @constant
 */
const RGB_BPTC_UNSIGNED_Format = 36495;

/**
 * RGTC1 Red format.
 *
 * @type {number}
 * @constant
 */
const RED_RGTC1_Format = 36283;

/**
 * RGTC1 Signed Red format.
 *
 * @type {number}
 * @constant
 */
const SIGNED_RED_RGTC1_Format = 36284;

/**
 * RGTC2 Red Green format.
 *
 * @type {number}
 * @constant
 */
const RED_GREEN_RGTC2_Format = 36285;

/**
 * RGTC2 Signed Red Green format.
 *
 * @type {number}
 * @constant
 */
const SIGNED_RED_GREEN_RGTC2_Format = 36286;

/**
 * Animations are played once.
 *
 * @type {number}
 * @constant
 */
const LoopOnce = 2200;

/**
 * Animations are played with a chosen number of repetitions, each time jumping from
 * the end of the clip directly to its beginning.
 *
 * @type {number}
 * @constant
 */
const LoopRepeat = 2201;

/**
 * Animations are played with a chosen number of repetitions, alternately playing forward
 * and backward.
 *
 * @type {number}
 * @constant
 */
const LoopPingPong = 2202;

/**
 * Discrete interpolation mode for keyframe tracks.
 *
 * @type {number}
 * @constant
 */
const InterpolateDiscrete = 2300;

/**
 * Linear interpolation mode for keyframe tracks.
 *
 * @type {number}
 * @constant
 */
const InterpolateLinear = 2301;

/**
 * Smooth interpolation mode for keyframe tracks.
 *
 * @type {number}
 * @constant
 */
const InterpolateSmooth = 2302;

/**
 * Zero curvature ending for animations.
 *
 * @type {number}
 * @constant
 */
const ZeroCurvatureEnding = 2400;

/**
 * Zero slope ending for animations.
 *
 * @type {number}
 * @constant
 */
const ZeroSlopeEnding = 2401;

/**
 * Wrap around ending for animations.
 *
 * @type {number}
 * @constant
 */
const WrapAroundEnding = 2402;

/**
 * Default animation blend mode.
 *
 * @type {number}
 * @constant
 */
const NormalAnimationBlendMode = 2500;

/**
 * Additive animation blend mode. Can be used to layer motions on top of
 * each other to build complex performances from smaller re-usable assets.
 *
 * @type {number}
 * @constant
 */
const AdditiveAnimationBlendMode = 2501;

/**
 * For every three vertices draw a single triangle.
 *
 * @type {number}
 * @constant
 */
const TrianglesDrawMode = 0;

/**
 * For each vertex draw a triangle from the last three vertices.
 *
 * @type {number}
 * @constant
 */
const TriangleStripDrawMode = 1;

/**
 * For each vertex draw a triangle from the first vertex and the last two vertices.
 *
 * @type {number}
 * @constant
 */
const TriangleFanDrawMode = 2;

/**
 * Basic depth packing.
 *
 * @type {number}
 * @constant
 */
const BasicDepthPacking = 3200;

/**
 * A depth value is packed into 32 bit RGBA.
 *
 * @type {number}
 * @constant
 */
const RGBADepthPacking = 3201;

/**
 * A depth value is packed into 24 bit RGB.
 *
 * @type {number}
 * @constant
 */
const RGBDepthPacking = 3202;

/**
 * A depth value is packed into 16 bit RG.
 *
 * @type {number}
 * @constant
 */
const RGDepthPacking = 3203;

/**
 * Normal information is relative to the underlying surface.
 *
 * @type {number}
 * @constant
 */
const TangentSpaceNormalMap = 0;

/**
 * Normal information is relative to the object orientation.
 *
 * @type {number}
 * @constant
 */
const ObjectSpaceNormalMap = 1;

// Color space string identifiers, matching CSS Color Module Level 4 and WebGPU names where available.

/**
 * No color space.
 *
 * @type {string}
 * @constant
 */
const NoColorSpace = '';

/**
 * sRGB color space.
 *
 * @type {string}
 * @constant
 */
const SRGBColorSpace = 'srgb';

/**
 * sRGB-linear color space.
 *
 * @type {string}
 * @constant
 */
const LinearSRGBColorSpace = 'srgb-linear';

/**
 * Linear transfer function.
 *
 * @type {string}
 * @constant
 */
const LinearTransfer = 'linear';

/**
 * sRGB transfer function.
 *
 * @type {string}
 * @constant
 */
const SRGBTransfer = 'srgb';

/**
 * Sets the stencil buffer value to `0`.
 *
 * @type {number}
 * @constant
 */
const ZeroStencilOp = 0;

/**
 * Keeps the current value.
 *
 * @type {number}
 * @constant
 */
const KeepStencilOp = 7680;

/**
 * Sets the stencil buffer value to the specified reference value.
 *
 * @type {number}
 * @constant
 */
const ReplaceStencilOp = 7681;

/**
 * Increments the current stencil buffer value. Clamps to the maximum representable unsigned value.
 *
 * @type {number}
 * @constant
 */
const IncrementStencilOp = 7682;

/**
 * Decrements the current stencil buffer value. Clamps to `0`.
 *
 * @type {number}
 * @constant
 */
const DecrementStencilOp = 7683;

/**
 * Increments the current stencil buffer value. Wraps stencil buffer value to zero when incrementing
 * the maximum representable unsigned value.
 *
 * @type {number}
 * @constant
 */
const IncrementWrapStencilOp = 34055;

/**
 * Decrements the current stencil buffer value. Wraps stencil buffer value to the maximum representable
 * unsigned value when decrementing a stencil buffer value of `0`.
 *
 * @type {number}
 * @constant
 */
const DecrementWrapStencilOp = 34056;

/**
 * Inverts the current stencil buffer value bitwise.
 *
 * @type {number}
 * @constant
 */
const InvertStencilOp = 5386;

/**
 * Will never return true.
 *
 * @type {number}
 * @constant
 */
const NeverStencilFunc = 512;

/**
 * Will return true if the stencil reference value is less than the current stencil value.
 *
 * @type {number}
 * @constant
 */
const LessStencilFunc = 513;

/**
 * Will return true if the stencil reference value is equal to the current stencil value.
 *
 * @type {number}
 * @constant
 */
const EqualStencilFunc = 514;

/**
 * Will return true if the stencil reference value is less than or equal to the current stencil value.
 *
 * @type {number}
 * @constant
 */
const LessEqualStencilFunc = 515;

/**
 * Will return true if the stencil reference value is greater than the current stencil value.
 *
 * @type {number}
 * @constant
 */
const GreaterStencilFunc = 516;

/**
 * Will return true if the stencil reference value is not equal to the current stencil value.
 *
 * @type {number}
 * @constant
 */
const NotEqualStencilFunc = 517;

/**
 * Will return true if the stencil reference value is greater than or equal to the current stencil value.
 *
 * @type {number}
 * @constant
 */
const GreaterEqualStencilFunc = 518;

/**
 * Will always return true.
 *
 * @type {number}
 * @constant
 */
const AlwaysStencilFunc = 519;

/**
 * Never pass.
 *
 * @type {number}
 * @constant
 */
const NeverCompare = 512;

/**
 * Pass if the incoming value is less than the texture value.
 *
 * @type {number}
 * @constant
 */
const LessCompare = 513;

/**
 * Pass if the incoming value equals the texture value.
 *
 * @type {number}
 * @constant
 */
const EqualCompare = 514;

/**
 * Pass if the incoming value is less than or equal to the texture value.
 *
 * @type {number}
 * @constant
 */
const LessEqualCompare = 515;

/**
 * Pass if the incoming value is greater than the texture value.
 *
 * @type {number}
 * @constant
 */
const GreaterCompare = 516;

/**
 * Pass if the incoming value is not equal to the texture value.
 *
 * @type {number}
 * @constant
 */
const NotEqualCompare = 517;

/**
 * Pass if the incoming value is greater than or equal to the texture value.
 *
 * @type {number}
 * @constant
 */
const GreaterEqualCompare = 518;

/**
 * Always pass.
 *
 * @type {number}
 * @constant
 */
const AlwaysCompare = 519;

/**
 * The contents are intended to be specified once by the application, and used many
 * times as the source for drawing and image specification commands.
 *
 * @type {number}
 * @constant
 */
const StaticDrawUsage = 35044;

/**
 * The contents are intended to be respecified repeatedly by the application, and
 * used many times as the source for drawing and image specification commands.
 *
 * @type {number}
 * @constant
 */
const DynamicDrawUsage = 35048;

/**
 * The contents are intended to be specified once by the application, and used at most
 * a few times as the source for drawing and image specification commands.
 *
 * @type {number}
 * @constant
 */
const StreamDrawUsage = 35040;

/**
 * The contents are intended to be specified once by reading data from the 3D API, and queried
 * many times by the application.
 *
 * @type {number}
 * @constant
 */
const StaticReadUsage = 35045;

/**
 * The contents are intended to be respecified repeatedly by reading data from the 3D API, and queried
 * many times by the application.
 *
 * @type {number}
 * @constant
 */
const DynamicReadUsage = 35049;

/**
 * The contents are intended to be specified once by reading data from the 3D API, and queried at most
 * a few times by the application
 *
 * @type {number}
 * @constant
 */
const StreamReadUsage = 35041;

/**
 * The contents are intended to be specified once by reading data from the 3D API, and used many times as
 * the source for WebGL drawing and image specification commands.
 *
 * @type {number}
 * @constant
 */
const StaticCopyUsage = 35046;

/**
 * The contents are intended to be respecified repeatedly by reading data from the 3D API, and used many times
 * as the source for WebGL drawing and image specification commands.
 *
 * @type {number}
 * @constant
 */
const DynamicCopyUsage = 35050;

/**
 * The contents are intended to be specified once by reading data from the 3D API, and used at most a few times
 * as the source for WebGL drawing and image specification commands.
 *
 * @type {number}
 * @constant
 */
const StreamCopyUsage = 35042;

/**
 * GLSL 1 shader code.
 *
 * @type {string}
 * @constant
 */
const GLSL1 = '100';

/**
 * GLSL 3 shader code.
 *
 * @type {string}
 * @constant
 */
const GLSL3 = '300 es';

/**
 * WebGL coordinate system.
 *
 * @type {number}
 * @constant
 */
const WebGLCoordinateSystem = 2000;

/**
 * WebGPU coordinate system.
 *
 * @type {number}
 * @constant
 */
const WebGPUCoordinateSystem = 2001;

/**
 * Represents the different timestamp query types.
 *
 * @type {ConstantsTimestampQuery}
 * @constant
 */
const TimestampQuery = {
	COMPUTE: 'compute',
	RENDER: 'render'
};

/**
 * Represents mouse buttons and interaction types in context of controls.
 *
 * @type {ConstantsInterpolationSamplingType}
 * @constant
 */
const InterpolationSamplingType = {
	PERSPECTIVE: 'perspective',
	LINEAR: 'linear',
	FLAT: 'flat'
};

/**
 * Represents the different interpolation sampling modes.
 *
 * @type {ConstantsInterpolationSamplingMode}
 * @constant
 */
const InterpolationSamplingMode = {
	NORMAL: 'normal',
	CENTROID: 'centroid',
	SAMPLE: 'sample',
	FIRST: 'first',
	EITHER: 'either'
};

/**
 * This type represents mouse buttons and interaction types in context of controls.
 *
 * @typedef {Object} ConstantsMouse
 * @property {number} MIDDLE - The left mouse button.
 * @property {number} LEFT - The middle mouse button.
 * @property {number} RIGHT - The right mouse button.
 * @property {number} ROTATE - A rotate interaction.
 * @property {number} DOLLY - A dolly interaction.
 * @property {number} PAN - A pan interaction.
 **/

/**
 * This type represents touch interaction types in context of controls.
 *
 * @typedef {Object} ConstantsTouch
 * @property {number} ROTATE - A rotate interaction.
 * @property {number} PAN - A pan interaction.
 * @property {number} DOLLY_PAN - The dolly-pan interaction.
 * @property {number} DOLLY_ROTATE - A dolly-rotate interaction.
 **/

/**
 * This type represents the different timestamp query types.
 *
 * @typedef {Object} ConstantsTimestampQuery
 * @property {string} COMPUTE - A `compute` timestamp query.
 * @property {string} RENDER - A `render` timestamp query.
 **/

/**
 * Represents the different interpolation sampling types.
 *
 * @typedef {Object} ConstantsInterpolationSamplingType
 * @property {string} PERSPECTIVE - Perspective-correct interpolation.
 * @property {string} LINEAR - Linear interpolation.
 * @property {string} FLAT - Flat interpolation.
 */

/**
 * Represents the different interpolation sampling modes.
 *
 * @typedef {Object} ConstantsInterpolationSamplingMode
 * @property {string} NORMAL - Normal sampling mode.
 * @property {string} CENTROID - Centroid sampling mode.
 * @property {string} SAMPLE - Sample-specific sampling mode.
 * @property {string} FIRST - Flat interpolation using the first vertex.
 * @property {string} EITHER - Flat interpolation using either vertex.
 */

/**
 * This modules allows to dispatch event objects on custom JavaScript objects.
 *
 * Main repository: [eventdispatcher.js]{@link https://github.com/mrdoob/eventdispatcher.js/}
 *
 * Code Example:
 * ```js
 * class Car extends EventDispatcher {
 * 	start() {
 *		this.dispatchEvent( { type: 'start', message: 'vroom vroom!' } );
 *	}
 *};
 *
 * // Using events with the custom object
 * const car = new Car();
 * car.addEventListener( 'start', function ( event ) {
 * 	alert( event.message );
 * } );
 *
 * car.start();
 * ```
 */
class EventDispatcher {

	/**
	 * Adds the given event listener to the given event type.
	 *
	 * @param {string} type - The type of event to listen to.
	 * @param {Function} listener - The function that gets called when the event is fired.
	 */
	addEventListener( type, listener ) {

		if ( this._listeners === undefined ) this._listeners = {};

		const listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === -1 ) {

			listeners[ type ].push( listener );

		}

	}

	/**
	 * Returns `true` if the given event listener has been added to the given event type.
	 *
	 * @param {string} type - The type of event.
	 * @param {Function} listener - The listener to check.
	 * @return {boolean} Whether the given event listener has been added to the given event type.
	 */
	hasEventListener( type, listener ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) return false;

		return listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== -1;

	}

	/**
	 * Removes the given event listener from the given event type.
	 *
	 * @param {string} type - The type of event.
	 * @param {Function} listener - The listener to remove.
	 */
	removeEventListener( type, listener ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) return;

		const listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== -1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	}

	/**
	 * Dispatches an event object.
	 *
	 * @param {Object} event - The event that gets fired.
	 */
	dispatchEvent( event ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) return;

		const listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {

			event.target = this;

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice( 0 );

			for ( let i = 0, l = array.length; i < l; i ++ ) {

				array[ i ].call( this, event );

			}

			event.target = null;

		}

	}

}

const _lut = [ '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff' ];

let _seed = 1234567;


const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Generate a [UUID]{@link https://en.wikipedia.org/wiki/Universally_unique_identifier}
 * (universally unique identifier).
 *
 * @return {string} The UUID.
 */
function generateUUID() {

	// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136

	const d0 = Math.random() * 0xffffffff | 0;
	const d1 = Math.random() * 0xffffffff | 0;
	const d2 = Math.random() * 0xffffffff | 0;
	const d3 = Math.random() * 0xffffffff | 0;
	const uuid = _lut[ d0 & 0xff ] + _lut[ d0 >> 8 & 0xff ] + _lut[ d0 >> 16 & 0xff ] + _lut[ d0 >> 24 & 0xff ] + '-' +
			_lut[ d1 & 0xff ] + _lut[ d1 >> 8 & 0xff ] + '-' + _lut[ d1 >> 16 & 0x0f | 0x40 ] + _lut[ d1 >> 24 & 0xff ] + '-' +
			_lut[ d2 & 0x3f | 0x80 ] + _lut[ d2 >> 8 & 0xff ] + '-' + _lut[ d2 >> 16 & 0xff ] + _lut[ d2 >> 24 & 0xff ] +
			_lut[ d3 & 0xff ] + _lut[ d3 >> 8 & 0xff ] + _lut[ d3 >> 16 & 0xff ] + _lut[ d3 >> 24 & 0xff ];

	// .toLowerCase() here flattens concatenated strings to save heap memory space.
	return uuid.toLowerCase();

}

/**
 * Clamps the given value between min and max.
 *
 * @param {number} value - The value to clamp.
 * @param {number} min - The min value.
 * @param {number} max - The max value.
 * @return {number} The clamped value.
 */
function clamp( value, min, max ) {

	return Math.max( min, Math.min( max, value ) );

}

/**
 * Computes the Euclidean modulo of the given parameters that
 * is `( ( n % m ) + m ) % m`.
 *
 * @param {number} n - The first parameter.
 * @param {number} m - The second parameter.
 * @return {number} The Euclidean modulo.
 */
function euclideanModulo( n, m ) {

	// https://en.wikipedia.org/wiki/Modulo_operation

	return ( ( n % m ) + m ) % m;

}

/**
 * Performs a linear mapping from range `<a1, a2>` to range `<b1, b2>`
 * for the given value.
 *
 * @param {number} x - The value to be mapped.
 * @param {number} a1 - Minimum value for range A.
 * @param {number} a2 - Maximum value for range A.
 * @param {number} b1 - Minimum value for range B.
 * @param {number} b2 - Maximum value for range B.
 * @return {number} The mapped value.
 */
function mapLinear( x, a1, a2, b1, b2 ) {

	return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );

}

/**
 * Returns the percentage in the closed interval `[0, 1]` of the given value
 * between the start and end point.
 *
 * @param {number} x - The start point
 * @param {number} y - The end point.
 * @param {number} value - A value between start and end.
 * @return {number} The interpolation factor.
 */
function inverseLerp( x, y, value ) {

	// https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/inverse-lerp-a-super-useful-yet-often-overlooked-function-r5230/

	if ( x !== y ) {

		return ( value - x ) / ( y - x );

	} else {

		return 0;

	}

}

/**
 * Returns a value linearly interpolated from two known points based on the given interval -
 * `t = 0` will return `x` and `t = 1` will return `y`.
 *
 * @param {number} x - The start point
 * @param {number} y - The end point.
 * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
 * @return {number} The interpolated value.
 */
function lerp( x, y, t ) {

	return ( 1 - t ) * x + t * y;

}

/**
 * Smoothly interpolate a number from `x` to `y` in  a spring-like manner using a delta
 * time to maintain frame rate independent movement. For details, see
 * [Frame rate independent damping using lerp]{@link http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/}.
 *
 * @param {number} x - The current point.
 * @param {number} y - The target point.
 * @param {number} lambda - A higher lambda value will make the movement more sudden,
 * and a lower value will make the movement more gradual.
 * @param {number} dt - Delta time in seconds.
 * @return {number} The interpolated value.
 */
function damp( x, y, lambda, dt ) {

	return lerp( x, y, 1 - Math.exp( - lambda * dt ) );

}

/**
 * Returns a value that alternates between `0` and the given `length` parameter.
 *
 * @param {number} x - The value to pingpong.
 * @param {number} [length=1] - The positive value the function will pingpong to.
 * @return {number} The alternated value.
 */
function pingpong( x, length = 1 ) {

	// https://www.desmos.com/calculator/vcsjnyz7x4

	return length - Math.abs( euclideanModulo( x, length * 2 ) - length );

}

/**
 * Returns a value in the range `[0,1]` that represents the percentage that `x` has
 * moved between `min` and `max`, but smoothed or slowed down the closer `x` is to
 * the `min` and `max`.
 *
 * See [Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep} for more details.
 *
 * @param {number} x - The value to evaluate based on its position between min and max.
 * @param {number} min - The min value. Any x value below min will be `0`.
 * @param {number} max - The max value. Any x value above max will be `1`.
 * @return {number} The alternated value.
 */
function smoothstep( x, min, max ) {

	if ( x <= min ) return 0;
	if ( x >= max ) return 1;

	x = ( x - min ) / ( max - min );

	return x * x * ( 3 - 2 * x );

}

/**
 * A [variation on smoothstep]{@link https://en.wikipedia.org/wiki/Smoothstep#Variations}
 * that has zero 1st and 2nd order derivatives at x=0 and x=1.
 *
 * @param {number} x - The value to evaluate based on its position between min and max.
 * @param {number} min - The min value. Any x value below min will be `0`.
 * @param {number} max - The max value. Any x value above max will be `1`.
 * @return {number} The alternated value.
 */
function smootherstep( x, min, max ) {

	if ( x <= min ) return 0;
	if ( x >= max ) return 1;

	x = ( x - min ) / ( max - min );

	return x * x * x * ( x * ( x * 6 - 15 ) + 10 );

}

/**
 * Returns a random integer from `<low, high>` interval.
 *
 * @param {number} low - The lower value boundary.
 * @param {number} high - The upper value boundary
 * @return {number} A random integer.
 */
function randInt( low, high ) {

	return low + Math.floor( Math.random() * ( high - low + 1 ) );

}

/**
 * Returns a random float from `<low, high>` interval.
 *
 * @param {number} low - The lower value boundary.
 * @param {number} high - The upper value boundary
 * @return {number} A random float.
 */
function randFloat( low, high ) {

	return low + Math.random() * ( high - low );

}

/**
 * Returns a random integer from `<-range/2, range/2>` interval.
 *
 * @param {number} range - Defines the value range.
 * @return {number} A random float.
 */
function randFloatSpread( range ) {

	return range * ( 0.5 - Math.random() );

}

/**
 * Returns a deterministic pseudo-random float in the interval `[0, 1]`.
 *
 * @param {number} [s] - The integer seed.
 * @return {number} A random float.
 */
function seededRandom( s ) {

	if ( s !== undefined ) _seed = s;

	// Mulberry32 generator

	let t = _seed += 0x6D2B79F5;

	t = Math.imul( t ^ t >>> 15, t | 1 );

	t ^= t + Math.imul( t ^ t >>> 7, t | 61 );

	return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;

}

/**
 * Converts degrees to radians.
 *
 * @param {number} degrees - A value in degrees.
 * @return {number} The converted value in radians.
 */
function degToRad( degrees ) {

	return degrees * DEG2RAD;

}

/**
 * Converts radians to degrees.
 *
 * @param {number} radians - A value in radians.
 * @return {number} The converted value in degrees.
 */
function radToDeg( radians ) {

	return radians * RAD2DEG;

}

/**
 * Returns `true` if the given number is a power of two.
 *
 * @param {number} value - The value to check.
 * @return {boolean} Whether the given number is a power of two or not.
 */
function isPowerOfTwo( value ) {

	return ( value & ( value - 1 ) ) === 0 && value !== 0;

}

/**
 * Returns the smallest power of two that is greater than or equal to the given number.
 *
 * @param {number} value - The value to find a POT for.
 * @return {number} The smallest power of two that is greater than or equal to the given number.
 */
function ceilPowerOfTwo( value ) {

	return Math.pow( 2, Math.ceil( Math.log( value ) / Math.LN2 ) );

}

/**
 * Returns the largest power of two that is less than or equal to the given number.
 *
 * @param {number} value - The value to find a POT for.
 * @return {number} The largest power of two that is less than or equal to the given number.
 */
function floorPowerOfTwo( value ) {

	return Math.pow( 2, Math.floor( Math.log( value ) / Math.LN2 ) );

}

/**
 * Sets the given quaternion from the [Intrinsic Proper Euler Angles]{@link https://en.wikipedia.org/wiki/Euler_angles}
 * defined by the given angles and order.
 *
 * Rotations are applied to the axes in the order specified by order:
 * rotation by angle `a` is applied first, then by angle `b`, then by angle `c`.
 *
 * @param {Quaternion} q - The quaternion to set.
 * @param {number} a - The rotation applied to the first axis, in radians.
 * @param {number} b - The rotation applied to the second axis, in radians.
 * @param {number} c - The rotation applied to the third axis, in radians.
 * @param {('XYX'|'XZX'|'YXY'|'YZY'|'ZXZ'|'ZYZ')} order - A string specifying the axes order.
 */
function setQuaternionFromProperEuler( q, a, b, c, order ) {

	const cos = Math.cos;
	const sin = Math.sin;

	const c2 = cos( b / 2 );
	const s2 = sin( b / 2 );

	const c13 = cos( ( a + c ) / 2 );
	const s13 = sin( ( a + c ) / 2 );

	const c1_3 = cos( ( a - c ) / 2 );
	const s1_3 = sin( ( a - c ) / 2 );

	const c3_1 = cos( ( c - a ) / 2 );
	const s3_1 = sin( ( c - a ) / 2 );

	switch ( order ) {

		case 'XYX':
			q.set( c2 * s13, s2 * c1_3, s2 * s1_3, c2 * c13 );
			break;

		case 'YZY':
			q.set( s2 * s1_3, c2 * s13, s2 * c1_3, c2 * c13 );
			break;

		case 'ZXZ':
			q.set( s2 * c1_3, s2 * s1_3, c2 * s13, c2 * c13 );
			break;

		case 'XZX':
			q.set( c2 * s13, s2 * s3_1, s2 * c3_1, c2 * c13 );
			break;

		case 'YXY':
			q.set( s2 * c3_1, c2 * s13, s2 * s3_1, c2 * c13 );
			break;

		case 'ZYZ':
			q.set( s2 * s3_1, s2 * c3_1, c2 * s13, c2 * c13 );
			break;

		default:
			console.warn( 'THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: ' + order );

	}

}

/**
 * Denormalizes the given value according to the given typed array.
 *
 * @param {number} value - The value to denormalize.
 * @param {TypedArray} array - The typed array that defines the data type of the value.
 * @return {number} The denormalize (float) value in the range `[0,1]`.
 */
function denormalize( value, array ) {

	switch ( array.constructor ) {

		case Float32Array:

			return value;

		case Uint32Array:

			return value / 4294967295.0;

		case Uint16Array:

			return value / 65535.0;

		case Uint8Array:

			return value / 255.0;

		case Int32Array:

			return Math.max( value / 2147483647.0, -1 );

		case Int16Array:

			return Math.max( value / 32767.0, -1 );

		case Int8Array:

			return Math.max( value / 127.0, -1 );

		default:

			throw new Error( 'Invalid component type.' );

	}

}

/**
 * Normalizes the given value according to the given typed array.
 *
 * @param {number} value - The float value in the range `[0,1]` to normalize.
 * @param {TypedArray} array - The typed array that defines the data type of the value.
 * @return {number} The normalize value.
 */
function normalize( value, array ) {

	switch ( array.constructor ) {

		case Float32Array:

			return value;

		case Uint32Array:

			return Math.round( value * 4294967295.0 );

		case Uint16Array:

			return Math.round( value * 65535.0 );

		case Uint8Array:

			return Math.round( value * 255.0 );

		case Int32Array:

			return Math.round( value * 2147483647.0 );

		case Int16Array:

			return Math.round( value * 32767.0 );

		case Int8Array:

			return Math.round( value * 127.0 );

		default:

			throw new Error( 'Invalid component type.' );

	}

}

/**
 * @class
 * @classdesc A collection of math utility functions.
 * @hideconstructor
 */
const MathUtils = {
	DEG2RAD: DEG2RAD,
	RAD2DEG: RAD2DEG,
	/**
	 * Generate a [UUID]{@link https://en.wikipedia.org/wiki/Universally_unique_identifier}
	 * (universally unique identifier).
	 *
	 * @static
	 * @method
	 * @return {string} The UUID.
	 */
	generateUUID: generateUUID,
	/**
	 * Clamps the given value between min and max.
	 *
	 * @static
	 * @method
	 * @param {number} value - The value to clamp.
	 * @param {number} min - The min value.
	 * @param {number} max - The max value.
	 * @return {number} The clamped value.
	 */
	clamp: clamp,
	/**
	 * Computes the Euclidean modulo of the given parameters that
	 * is `( ( n % m ) + m ) % m`.
	 *
	 * @static
	 * @method
	 * @param {number} n - The first parameter.
	 * @param {number} m - The second parameter.
	 * @return {number} The Euclidean modulo.
	 */
	euclideanModulo: euclideanModulo,
	/**
	 * Performs a linear mapping from range `<a1, a2>` to range `<b1, b2>`
	 * for the given value.
	 *
	 * @static
	 * @method
	 * @param {number} x - The value to be mapped.
	 * @param {number} a1 - Minimum value for range A.
	 * @param {number} a2 - Maximum value for range A.
	 * @param {number} b1 - Minimum value for range B.
	 * @param {number} b2 - Maximum value for range B.
	 * @return {number} The mapped value.
	 */
	mapLinear: mapLinear,
	/**
	 * Returns the percentage in the closed interval `[0, 1]` of the given value
	 * between the start and end point.
	 *
	 * @static
	 * @method
	 * @param {number} x - The start point
	 * @param {number} y - The end point.
	 * @param {number} value - A value between start and end.
	 * @return {number} The interpolation factor.
	 */
	inverseLerp: inverseLerp,
	/**
	 * Returns a value linearly interpolated from two known points based on the given interval -
	 * `t = 0` will return `x` and `t = 1` will return `y`.
	 *
	 * @static
	 * @method
	 * @param {number} x - The start point
	 * @param {number} y - The end point.
	 * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
	 * @return {number} The interpolated value.
	 */
	lerp: lerp,
	/**
	 * Smoothly interpolate a number from `x` to `y` in  a spring-like manner using a delta
	 * time to maintain frame rate independent movement. For details, see
	 * [Frame rate independent damping using lerp]{@link http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/}.
	 *
	 * @static
	 * @method
	 * @param {number} x - The current point.
	 * @param {number} y - The target point.
	 * @param {number} lambda - A higher lambda value will make the movement more sudden,
	 * and a lower value will make the movement more gradual.
	 * @param {number} dt - Delta time in seconds.
	 * @return {number} The interpolated value.
	 */
	damp: damp,
	/**
	 * Returns a value that alternates between `0` and the given `length` parameter.
	 *
	 * @static
	 * @method
	 * @param {number} x - The value to pingpong.
	 * @param {number} [length=1] - The positive value the function will pingpong to.
	 * @return {number} The alternated value.
	 */
	pingpong: pingpong,
	/**
	 * Returns a value in the range `[0,1]` that represents the percentage that `x` has
	 * moved between `min` and `max`, but smoothed or slowed down the closer `x` is to
	 * the `min` and `max`.
	 *
	 * See [Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep} for more details.
	 *
	 * @static
	 * @method
	 * @param {number} x - The value to evaluate based on its position between min and max.
	 * @param {number} min - The min value. Any x value below min will be `0`.
	 * @param {number} max - The max value. Any x value above max will be `1`.
	 * @return {number} The alternated value.
	 */
	smoothstep: smoothstep,
	/**
	 * A [variation on smoothstep]{@link https://en.wikipedia.org/wiki/Smoothstep#Variations}
	 * that has zero 1st and 2nd order derivatives at x=0 and x=1.
	 *
	 * @static
	 * @method
	 * @param {number} x - The value to evaluate based on its position between min and max.
	 * @param {number} min - The min value. Any x value below min will be `0`.
	 * @param {number} max - The max value. Any x value above max will be `1`.
	 * @return {number} The alternated value.
	 */
	smootherstep: smootherstep,
	/**
	 * Returns a random integer from `<low, high>` interval.
	 *
	 * @static
	 * @method
	 * @param {number} low - The lower value boundary.
	 * @param {number} high - The upper value boundary
	 * @return {number} A random integer.
	 */
	randInt: randInt,
	/**
	 * Returns a random float from `<low, high>` interval.
	 *
	 * @static
	 * @method
	 * @param {number} low - The lower value boundary.
	 * @param {number} high - The upper value boundary
	 * @return {number} A random float.
	 */
	randFloat: randFloat,
	/**
	 * Returns a random integer from `<-range/2, range/2>` interval.
	 *
	 * @static
	 * @method
	 * @param {number} range - Defines the value range.
	 * @return {number} A random float.
	 */
	randFloatSpread: randFloatSpread,
	/**
	 * Returns a deterministic pseudo-random float in the interval `[0, 1]`.
	 *
	 * @static
	 * @method
	 * @param {number} [s] - The integer seed.
	 * @return {number} A random float.
	 */
	seededRandom: seededRandom,
	/**
	 * Converts degrees to radians.
	 *
	 * @static
	 * @method
	 * @param {number} degrees - A value in degrees.
	 * @return {number} The converted value in radians.
	 */
	degToRad: degToRad,
	/**
	 * Converts radians to degrees.
	 *
	 * @static
	 * @method
	 * @param {number} radians - A value in radians.
	 * @return {number} The converted value in degrees.
	 */
	radToDeg: radToDeg,
	/**
	 * Returns `true` if the given number is a power of two.
	 *
	 * @static
	 * @method
	 * @param {number} value - The value to check.
	 * @return {boolean} Whether the given number is a power of two or not.
	 */
	isPowerOfTwo: isPowerOfTwo,
	/**
	 * Returns the smallest power of two that is greater than or equal to the given number.
	 *
	 * @static
	 * @method
	 * @param {number} value - The value to find a POT for.
	 * @return {number} The smallest power of two that is greater than or equal to the given number.
	 */
	ceilPowerOfTwo: ceilPowerOfTwo,
	/**
	 * Returns the largest power of two that is less than or equal to the given number.
	 *
	 * @static
	 * @method
	 * @param {number} value - The value to find a POT for.
	 * @return {number} The largest power of two that is less than or equal to the given number.
	 */
	floorPowerOfTwo: floorPowerOfTwo,
	/**
	 * Sets the given quaternion from the [Intrinsic Proper Euler Angles]{@link https://en.wikipedia.org/wiki/Euler_angles}
	 * defined by the given angles and order.
	 *
	 * Rotations are applied to the axes in the order specified by order:
	 * rotation by angle `a` is applied first, then by angle `b`, then by angle `c`.
	 *
	 * @static
	 * @method
	 * @param {Quaternion} q - The quaternion to set.
	 * @param {number} a - The rotation applied to the first axis, in radians.
	 * @param {number} b - The rotation applied to the second axis, in radians.
	 * @param {number} c - The rotation applied to the third axis, in radians.
	 * @param {('XYX'|'XZX'|'YXY'|'YZY'|'ZXZ'|'ZYZ')} order - A string specifying the axes order.
	 */
	setQuaternionFromProperEuler: setQuaternionFromProperEuler,
	/**
	 * Normalizes the given value according to the given typed array.
	 *
	 * @static
	 * @method
	 * @param {number} value - The float value in the range `[0,1]` to normalize.
	 * @param {TypedArray} array - The typed array that defines the data type of the value.
	 * @return {number} The normalize value.
	 */
	normalize: normalize,
	/**
	 * Denormalizes the given value according to the given typed array.
	 *
	 * @static
	 * @method
	 * @param {number} value - The value to denormalize.
	 * @param {TypedArray} array - The typed array that defines the data type of the value.
	 * @return {number} The denormalize (float) value in the range `[0,1]`.
	 */
	denormalize: denormalize
};

/**
 * Class representing a 2D vector. A 2D vector is an ordered pair of numbers
 * (labeled x and y), which can be used to represent a number of things, such as:
 *
 * - A point in 2D space (i.e. a position on a plane).
 * - A direction and length across a plane. In three.js the length will
 * always be the Euclidean distance(straight-line distance) from `(0, 0)` to `(x, y)`
 * and the direction is also measured from `(0, 0)` towards `(x, y)`.
 * - Any arbitrary ordered pair of numbers.
 *
 * There are other things a 2D vector can be used to represent, such as
 * momentum vectors, complex numbers and so on, however these are the most
 * common uses in three.js.
 *
 * Iterating through a vector instance will yield its components `(x, y)` in
 * the corresponding order.
 * ```js
 * const a = new THREE.Vector2( 0, 1 );
 *
 * //no arguments; will be initialised to (0, 0)
 * const b = new THREE.Vector2( );
 *
 * const d = a.distanceTo( b );
 * ```
 */
class Vector2 {

	/**
	 * Constructs a new 2D vector.
	 *
	 * @param {number} [x=0] - The x value of this vector.
	 * @param {number} [y=0] - The y value of this vector.
	 */
	constructor( x = 0, y = 0 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		Vector2.prototype.isVector2 = true;

		/**
		 * The x value of this vector.
		 *
		 * @type {number}
		 */
		this.x = x;

		/**
		 * The y value of this vector.
		 *
		 * @type {number}
		 */
		this.y = y;

	}

	/**
	 * Alias for {@link Vector2#x}.
	 *
	 * @type {number}
	 */
	get width() {

		return this.x;

	}

	set width( value ) {

		this.x = value;

	}

	/**
	 * Alias for {@link Vector2#y}.
	 *
	 * @type {number}
	 */
	get height() {

		return this.y;

	}

	set height( value ) {

		this.y = value;

	}

	/**
	 * Sets the vector components.
	 *
	 * @param {number} x - The value of the x component.
	 * @param {number} y - The value of the y component.
	 * @return {Vector2} A reference to this vector.
	 */
	set( x, y ) {

		this.x = x;
		this.y = y;

		return this;

	}

	/**
	 * Sets the vector components to the same value.
	 *
	 * @param {number} scalar - The value to set for all vector components.
	 * @return {Vector2} A reference to this vector.
	 */
	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;

		return this;

	}

	/**
	 * Sets the vector's x component to the given value
	 *
	 * @param {number} x - The value to set.
	 * @return {Vector2} A reference to this vector.
	 */
	setX( x ) {

		this.x = x;

		return this;

	}

	/**
	 * Sets the vector's y component to the given value
	 *
	 * @param {number} y - The value to set.
	 * @return {Vector2} A reference to this vector.
	 */
	setY( y ) {

		this.y = y;

		return this;

	}

	/**
	 * Allows to set a vector component with an index.
	 *
	 * @param {number} index - The component index. `0` equals to x, `1` equals to y.
	 * @param {number} value - The value to set.
	 * @return {Vector2} A reference to this vector.
	 */
	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

	/**
	 * Returns the value of the vector component which matches the given index.
	 *
	 * @param {number} index - The component index. `0` equals to x, `1` equals to y.
	 * @return {number} A vector component value.
	 */
	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

	/**
	 * Returns a new vector with copied values from this instance.
	 *
	 * @return {Vector2} A clone of this instance.
	 */
	clone() {

		return new this.constructor( this.x, this.y );

	}

	/**
	 * Copies the values of the given vector to this instance.
	 *
	 * @param {Vector2} v - The vector to copy.
	 * @return {Vector2} A reference to this vector.
	 */
	copy( v ) {

		this.x = v.x;
		this.y = v.y;

		return this;

	}

	/**
	 * Adds the given vector to this instance.
	 *
	 * @param {Vector2} v - The vector to add.
	 * @return {Vector2} A reference to this vector.
	 */
	add( v ) {

		this.x += v.x;
		this.y += v.y;

		return this;

	}

	/**
	 * Adds the given scalar value to all components of this instance.
	 *
	 * @param {number} s - The scalar to add.
	 * @return {Vector2} A reference to this vector.
	 */
	addScalar( s ) {

		this.x += s;
		this.y += s;

		return this;

	}

	/**
	 * Adds the given vectors and stores the result in this instance.
	 *
	 * @param {Vector2} a - The first vector.
	 * @param {Vector2} b - The second vector.
	 * @return {Vector2} A reference to this vector.
	 */
	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;

		return this;

	}

	/**
	 * Adds the given vector scaled by the given factor to this instance.
	 *
	 * @param {Vector2} v - The vector.
	 * @param {number} s - The factor that scales `v`.
	 * @return {Vector2} A reference to this vector.
	 */
	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;

		return this;

	}

	/**
	 * Subtracts the given vector from this instance.
	 *
	 * @param {Vector2} v - The vector to subtract.
	 * @return {Vector2} A reference to this vector.
	 */
	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;

		return this;

	}

	/**
	 * Subtracts the given scalar value from all components of this instance.
	 *
	 * @param {number} s - The scalar to subtract.
	 * @return {Vector2} A reference to this vector.
	 */
	subScalar( s ) {

		this.x -= s;
		this.y -= s;

		return this;

	}

	/**
	 * Subtracts the given vectors and stores the result in this instance.
	 *
	 * @param {Vector2} a - The first vector.
	 * @param {Vector2} b - The second vector.
	 * @return {Vector2} A reference to this vector.
	 */
	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;

		return this;

	}

	/**
	 * Multiplies the given vector with this instance.
	 *
	 * @param {Vector2} v - The vector to multiply.
	 * @return {Vector2} A reference to this vector.
	 */
	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;

		return this;

	}

	/**
	 * Multiplies the given scalar value with all components of this instance.
	 *
	 * @param {number} scalar - The scalar to multiply.
	 * @return {Vector2} A reference to this vector.
	 */
	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;

		return this;

	}

	/**
	 * Divides this instance by the given vector.
	 *
	 * @param {Vector2} v - The vector to divide.
	 * @return {Vector2} A reference to this vector.
	 */
	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;

		return this;

	}

	/**
	 * Divides this vector by the given scalar.
	 *
	 * @param {number} scalar - The scalar to divide.
	 * @return {Vector2} A reference to this vector.
	 */
	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

	/**
	 * Multiplies this vector (with an implicit 1 as the 3rd component) by
	 * the given 3x3 matrix.
	 *
	 * @param {Matrix3} m - The matrix to apply.
	 * @return {Vector2} A reference to this vector.
	 */
	applyMatrix3( m ) {

		const x = this.x, y = this.y;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ];
		this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ];

		return this;

	}

	/**
	 * If this vector's x or y value is greater than the given vector's x or y
	 * value, replace that value with the corresponding min value.
	 *
	 * @param {Vector2} v - The vector.
	 * @return {Vector2} A reference to this vector.
	 */
	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );

		return this;

	}

	/**
	 * If this vector's x or y value is less than the given vector's x or y
	 * value, replace that value with the corresponding max value.
	 *
	 * @param {Vector2} v - The vector.
	 * @return {Vector2} A reference to this vector.
	 */
	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );

		return this;

	}

	/**
	 * If this vector's x or y value is greater than the max vector's x or y
	 * value, it is replaced by the corresponding value.
	 * If this vector's x or y value is less than the min vector's x or y value,
	 * it is replaced by the corresponding value.
	 *
	 * @param {Vector2} min - The minimum x and y values.
	 * @param {Vector2} max - The maximum x and y values in the desired range.
	 * @return {Vector2} A reference to this vector.
	 */
	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = clamp( this.x, min.x, max.x );
		this.y = clamp( this.y, min.y, max.y );

		return this;

	}

	/**
	 * If this vector's x or y values are greater than the max value, they are
	 * replaced by the max value.
	 * If this vector's x or y values are less than the min value, they are
	 * replaced by the min value.
	 *
	 * @param {number} minVal - The minimum value the components will be clamped to.
	 * @param {number} maxVal - The maximum value the components will be clamped to.
	 * @return {Vector2} A reference to this vector.
	 */
	clampScalar( minVal, maxVal ) {

		this.x = clamp( this.x, minVal, maxVal );
		this.y = clamp( this.y, minVal, maxVal );

		return this;

	}

	/**
	 * If this vector's length is greater than the max value, it is replaced by
	 * the max value.
	 * If this vector's length is less than the min value, it is replaced by the
	 * min value.
	 *
	 * @param {number} min - The minimum value the vector length will be clamped to.
	 * @param {number} max - The maximum value the vector length will be clamped to.
	 * @return {Vector2} A reference to this vector.
	 */
	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( clamp( length, min, max ) );

	}

	/**
	 * The components of this vector are rounded down to the nearest integer value.
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );

		return this;

	}

	/**
	 * The components of this vector are rounded up to the nearest integer value.
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );

		return this;

	}

	/**
	 * The components of this vector are rounded to the nearest integer value
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );

		return this;

	}

	/**
	 * The components of this vector are rounded towards zero (up if negative,
	 * down if positive) to an integer value.
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	roundToZero() {

		this.x = Math.trunc( this.x );
		this.y = Math.trunc( this.y );

		return this;

	}

	/**
	 * Inverts this vector - i.e. sets x = -x and y = -y.
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	negate() {

		this.x = - this.x;
		this.y = - this.y;

		return this;

	}

	/**
	 * Calculates the dot product of the given vector with this instance.
	 *
	 * @param {Vector2} v - The vector to compute the dot product with.
	 * @return {number} The result of the dot product.
	 */
	dot( v ) {

		return this.x * v.x + this.y * v.y;

	}

	/**
	 * Calculates the cross product of the given vector with this instance.
	 *
	 * @param {Vector2} v - The vector to compute the cross product with.
	 * @return {number} The result of the cross product.
	 */
	cross( v ) {

		return this.x * v.y - this.y * v.x;

	}

	/**
	 * Computes the square of the Euclidean length (straight-line length) from
	 * (0, 0) to (x, y). If you are comparing the lengths of vectors, you should
	 * compare the length squared instead as it is slightly more efficient to calculate.
	 *
	 * @return {number} The square length of this vector.
	 */
	lengthSq() {

		return this.x * this.x + this.y * this.y;

	}

	/**
	 * Computes the  Euclidean length (straight-line length) from (0, 0) to (x, y).
	 *
	 * @return {number} The length of this vector.
	 */
	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y );

	}

	/**
	 * Computes the Manhattan length of this vector.
	 *
	 * @return {number} The length of this vector.
	 */
	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y );

	}

	/**
	 * Converts this vector to a unit vector - that is, sets it equal to a vector
	 * with the same direction as this one, but with a vector length of `1`.
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	/**
	 * Computes the angle in radians of this vector with respect to the positive x-axis.
	 *
	 * @return {number} The angle in radians.
	 */
	angle() {

		const angle = Math.atan2( - this.y, - this.x ) + Math.PI;

		return angle;

	}

	/**
	 * Returns the angle between the given vector and this instance in radians.
	 *
	 * @param {Vector2} v - The vector to compute the angle with.
	 * @return {number} The angle in radians.
	 */
	angleTo( v ) {

		const denominator = Math.sqrt( this.lengthSq() * v.lengthSq() );

		if ( denominator === 0 ) return Math.PI / 2;

		const theta = this.dot( v ) / denominator;

		// clamp, to handle numerical problems

		return Math.acos( clamp( theta, -1, 1 ) );

	}

	/**
	 * Computes the distance from the given vector to this instance.
	 *
	 * @param {Vector2} v - The vector to compute the distance to.
	 * @return {number} The distance.
	 */
	distanceTo( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	}

	/**
	 * Computes the squared distance from the given vector to this instance.
	 * If you are just comparing the distance with another distance, you should compare
	 * the distance squared instead as it is slightly more efficient to calculate.
	 *
	 * @param {Vector2} v - The vector to compute the squared distance to.
	 * @return {number} The squared distance.
	 */
	distanceToSquared( v ) {

		const dx = this.x - v.x, dy = this.y - v.y;
		return dx * dx + dy * dy;

	}

	/**
	 * Computes the Manhattan distance from the given vector to this instance.
	 *
	 * @param {Vector2} v - The vector to compute the Manhattan distance to.
	 * @return {number} The Manhattan distance.
	 */
	manhattanDistanceTo( v ) {

		return Math.abs( this.x - v.x ) + Math.abs( this.y - v.y );

	}

	/**
	 * Sets this vector to a vector with the same direction as this one, but
	 * with the specified length.
	 *
	 * @param {number} length - The new length of this vector.
	 * @return {Vector2} A reference to this vector.
	 */
	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

	/**
	 * Linearly interpolates between the given vector and this instance, where
	 * alpha is the percent distance along the line - alpha = 0 will be this
	 * vector, and alpha = 1 will be the given one.
	 *
	 * @param {Vector2} v - The vector to interpolate towards.
	 * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
	 * @return {Vector2} A reference to this vector.
	 */
	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;

		return this;

	}

	/**
	 * Linearly interpolates between the given vectors, where alpha is the percent
	 * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
	 * be the second one. The result is stored in this instance.
	 *
	 * @param {Vector2} v1 - The first vector.
	 * @param {Vector2} v2 - The second vector.
	 * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
	 * @return {Vector2} A reference to this vector.
	 */
	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;

		return this;

	}

	/**
	 * Returns `true` if this vector is equal with the given one.
	 *
	 * @param {Vector2} v - The vector to test for equality.
	 * @return {boolean} Whether this vector is equal with the given one.
	 */
	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) );

	}

	/**
	 * Sets this vector's x value to be `array[ offset ]` and y
	 * value to be `array[ offset + 1 ]`.
	 *
	 * @param {Array<number>} array - An array holding the vector component values.
	 * @param {number} [offset=0] - The offset into the array.
	 * @return {Vector2} A reference to this vector.
	 */
	fromArray( array, offset = 0 ) {

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];

		return this;

	}

	/**
	 * Writes the components of this vector to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number>} [array=[]] - The target array holding the vector components.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number>} The vector components.
	 */
	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;

		return array;

	}

	/**
	 * Sets the components of this vector from the given buffer attribute.
	 *
	 * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
	 * @param {number} index - The index into the attribute.
	 * @return {Vector2} A reference to this vector.
	 */
	fromBufferAttribute( attribute, index ) {

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );

		return this;

	}

	/**
	 * Rotates this vector around the given center by the given angle.
	 *
	 * @param {Vector2} center - The point around which to rotate.
	 * @param {number} angle - The angle to rotate, in radians.
	 * @return {Vector2} A reference to this vector.
	 */
	rotateAround( center, angle ) {

		const c = Math.cos( angle ), s = Math.sin( angle );

		const x = this.x - center.x;
		const y = this.y - center.y;

		this.x = x * c - y * s + center.x;
		this.y = x * s + y * c + center.y;

		return this;

	}

	/**
	 * Sets each component of this vector to a pseudo-random value between `0` and
	 * `1`, excluding `1`.
	 *
	 * @return {Vector2} A reference to this vector.
	 */
	random() {

		this.x = Math.random();
		this.y = Math.random();

		return this;

	}

	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;

	}

}

/**
 * Class for representing a Quaternion. Quaternions are used in three.js to represent rotations.
 *
 * Iterating through a vector instance will yield its components `(x, y, z, w)` in
 * the corresponding order.
 *
 * Note that three.js expects Quaternions to be normalized.
 * ```js
 * const quaternion = new THREE.Quaternion();
 * quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
 *
 * const vector = new THREE.Vector3( 1, 0, 0 );
 * vector.applyQuaternion( quaternion );
 * ```
 */
class Quaternion {

	/**
	 * Constructs a new quaternion.
	 *
	 * @param {number} [x=0] - The x value of this quaternion.
	 * @param {number} [y=0] - The y value of this quaternion.
	 * @param {number} [z=0] - The z value of this quaternion.
	 * @param {number} [w=1] - The w value of this quaternion.
	 */
	constructor( x = 0, y = 0, z = 0, w = 1 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isQuaternion = true;

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

	}

	/**
	 * Interpolates between two quaternions via SLERP. This implementation assumes the
	 * quaternion data are managed  in flat arrays.
	 *
	 * @param {Array<number>} dst - The destination array.
	 * @param {number} dstOffset - An offset into the destination array.
	 * @param {Array<number>} src0 - The source array of the first quaternion.
	 * @param {number} srcOffset0 - An offset into the first source array.
	 * @param {Array<number>} src1 -  The source array of the second quaternion.
	 * @param {number} srcOffset1 - An offset into the second source array.
	 * @param {number} t - The interpolation factor in the range `[0,1]`.
	 * @see {@link Quaternion#slerp}
	 */
	static slerpFlat( dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t ) {

		// fuzz-free, array-based Quaternion SLERP operation

		let x0 = src0[ srcOffset0 + 0 ],
			y0 = src0[ srcOffset0 + 1 ],
			z0 = src0[ srcOffset0 + 2 ],
			w0 = src0[ srcOffset0 + 3 ];

		const x1 = src1[ srcOffset1 + 0 ],
			y1 = src1[ srcOffset1 + 1 ],
			z1 = src1[ srcOffset1 + 2 ],
			w1 = src1[ srcOffset1 + 3 ];

		if ( t === 0 ) {

			dst[ dstOffset + 0 ] = x0;
			dst[ dstOffset + 1 ] = y0;
			dst[ dstOffset + 2 ] = z0;
			dst[ dstOffset + 3 ] = w0;
			return;

		}

		if ( t === 1 ) {

			dst[ dstOffset + 0 ] = x1;
			dst[ dstOffset + 1 ] = y1;
			dst[ dstOffset + 2 ] = z1;
			dst[ dstOffset + 3 ] = w1;
			return;

		}

		if ( w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1 ) {

			let s = 1 - t;
			const cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1,
				dir = ( cos >= 0 ? 1 : -1 ),
				sqrSin = 1 - cos * cos;

			// Skip the Slerp for tiny steps to avoid numeric problems:
			if ( sqrSin > Number.EPSILON ) {

				const sin = Math.sqrt( sqrSin ),
					len = Math.atan2( sin, cos * dir );

				s = Math.sin( s * len ) / sin;
				t = Math.sin( t * len ) / sin;

			}

			const tDir = t * dir;

			x0 = x0 * s + x1 * tDir;
			y0 = y0 * s + y1 * tDir;
			z0 = z0 * s + z1 * tDir;
			w0 = w0 * s + w1 * tDir;

			// Normalize in case we just did a lerp:
			if ( s === 1 - t ) {

				const f = 1 / Math.sqrt( x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0 );

				x0 *= f;
				y0 *= f;
				z0 *= f;
				w0 *= f;

			}

		}

		dst[ dstOffset ] = x0;
		dst[ dstOffset + 1 ] = y0;
		dst[ dstOffset + 2 ] = z0;
		dst[ dstOffset + 3 ] = w0;

	}

	/**
	 * Multiplies two quaternions. This implementation assumes the quaternion data are managed
	 * in flat arrays.
	 *
	 * @param {Array<number>} dst - The destination array.
	 * @param {number} dstOffset - An offset into the destination array.
	 * @param {Array<number>} src0 - The source array of the first quaternion.
	 * @param {number} srcOffset0 - An offset into the first source array.
	 * @param {Array<number>} src1 -  The source array of the second quaternion.
	 * @param {number} srcOffset1 - An offset into the second source array.
	 * @return {Array<number>} The destination array.
	 * @see {@link Quaternion#multiplyQuaternions}.
	 */
	static multiplyQuaternionsFlat( dst, dstOffset, src0, srcOffset0, src1, srcOffset1 ) {

		const x0 = src0[ srcOffset0 ];
		const y0 = src0[ srcOffset0 + 1 ];
		const z0 = src0[ srcOffset0 + 2 ];
		const w0 = src0[ srcOffset0 + 3 ];

		const x1 = src1[ srcOffset1 ];
		const y1 = src1[ srcOffset1 + 1 ];
		const z1 = src1[ srcOffset1 + 2 ];
		const w1 = src1[ srcOffset1 + 3 ];

		dst[ dstOffset ] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
		dst[ dstOffset + 1 ] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
		dst[ dstOffset + 2 ] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
		dst[ dstOffset + 3 ] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;

		return dst;

	}

	/**
	 * The x value of this quaternion.
	 *
	 * @type {number}
	 * @default 0
	 */
	get x() {

		return this._x;

	}

	set x( value ) {

		this._x = value;
		this._onChangeCallback();

	}

	/**
	 * The y value of this quaternion.
	 *
	 * @type {number}
	 * @default 0
	 */
	get y() {

		return this._y;

	}

	set y( value ) {

		this._y = value;
		this._onChangeCallback();

	}

	/**
	 * The z value of this quaternion.
	 *
	 * @type {number}
	 * @default 0
	 */
	get z() {

		return this._z;

	}

	set z( value ) {

		this._z = value;
		this._onChangeCallback();

	}

	/**
	 * The w value of this quaternion.
	 *
	 * @type {number}
	 * @default 1
	 */
	get w() {

		return this._w;

	}

	set w( value ) {

		this._w = value;
		this._onChangeCallback();

	}

	/**
	 * Sets the quaternion components.
	 *
	 * @param {number} x - The x value of this quaternion.
	 * @param {number} y - The y value of this quaternion.
	 * @param {number} z - The z value of this quaternion.
	 * @param {number} w - The w value of this quaternion.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	set( x, y, z, w ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

		this._onChangeCallback();

		return this;

	}

	/**
	 * Returns a new quaternion with copied values from this instance.
	 *
	 * @return {Quaternion} A clone of this instance.
	 */
	clone() {

		return new this.constructor( this._x, this._y, this._z, this._w );

	}

	/**
	 * Copies the values of the given quaternion to this instance.
	 *
	 * @param {Quaternion} quaternion - The quaternion to copy.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	copy( quaternion ) {

		this._x = quaternion.x;
		this._y = quaternion.y;
		this._z = quaternion.z;
		this._w = quaternion.w;

		this._onChangeCallback();

		return this;

	}

	/**
	 * Sets this quaternion from the rotation specified by the given
	 * Euler angles.
	 *
	 * @param {Euler} euler - The Euler angles.
	 * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	setFromEuler( euler, update = true ) {

		const x = euler._x, y = euler._y, z = euler._z, order = euler._order;

		// http://www.mathworks.com/matlabcentral/fileexchange/
		// 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
		//	content/SpinCalc.m

		const cos = Math.cos;
		const sin = Math.sin;

		const c1 = cos( x / 2 );
		const c2 = cos( y / 2 );
		const c3 = cos( z / 2 );

		const s1 = sin( x / 2 );
		const s2 = sin( y / 2 );
		const s3 = sin( z / 2 );

		switch ( order ) {

			case 'XYZ':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'YXZ':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			case 'ZXY':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'ZYX':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			case 'YZX':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'XZY':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			default:
				console.warn( 'THREE.Quaternion: .setFromEuler() encountered an unknown order: ' + order );

		}

		if ( update === true ) this._onChangeCallback();

		return this;

	}

	/**
	 * Sets this quaternion from the given axis and angle.
	 *
	 * @param {Vector3} axis - The normalized axis.
	 * @param {number} angle - The angle in radians.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	setFromAxisAngle( axis, angle ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

		const halfAngle = angle / 2, s = Math.sin( halfAngle );

		this._x = axis.x * s;
		this._y = axis.y * s;
		this._z = axis.z * s;
		this._w = Math.cos( halfAngle );

		this._onChangeCallback();

		return this;

	}

	/**
	 * Sets this quaternion from the given rotation matrix.
	 *
	 * @param {Matrix4} m - A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
	 * @return {Quaternion} A reference to this quaternion.
	 */
	setFromRotationMatrix( m ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		const te = m.elements,

			m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
			m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
			m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ],

			trace = m11 + m22 + m33;

		if ( trace > 0 ) {

			const s = 0.5 / Math.sqrt( trace + 1.0 );

			this._w = 0.25 / s;
			this._x = ( m32 - m23 ) * s;
			this._y = ( m13 - m31 ) * s;
			this._z = ( m21 - m12 ) * s;

		} else if ( m11 > m22 && m11 > m33 ) {

			const s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

			this._w = ( m32 - m23 ) / s;
			this._x = 0.25 * s;
			this._y = ( m12 + m21 ) / s;
			this._z = ( m13 + m31 ) / s;

		} else if ( m22 > m33 ) {

			const s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

			this._w = ( m13 - m31 ) / s;
			this._x = ( m12 + m21 ) / s;
			this._y = 0.25 * s;
			this._z = ( m23 + m32 ) / s;

		} else {

			const s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

			this._w = ( m21 - m12 ) / s;
			this._x = ( m13 + m31 ) / s;
			this._y = ( m23 + m32 ) / s;
			this._z = 0.25 * s;

		}

		this._onChangeCallback();

		return this;

	}

	/**
	 * Sets this quaternion to the rotation required to rotate the direction vector
	 * `vFrom` to the direction vector `vTo`.
	 *
	 * @param {Vector3} vFrom - The first (normalized) direction vector.
	 * @param {Vector3} vTo - The second (normalized) direction vector.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	setFromUnitVectors( vFrom, vTo ) {

		// assumes direction vectors vFrom and vTo are normalized

		let r = vFrom.dot( vTo ) + 1;

		if ( r < 1e-8 ) { // the epsilon value has been discussed in #31286

			// vFrom and vTo point in opposite directions

			r = 0;

			if ( Math.abs( vFrom.x ) > Math.abs( vFrom.z ) ) {

				this._x = - vFrom.y;
				this._y = vFrom.x;
				this._z = 0;
				this._w = r;

			} else {

				this._x = 0;
				this._y = - vFrom.z;
				this._z = vFrom.y;
				this._w = r;

			}

		} else {

			// crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3

			this._x = vFrom.y * vTo.z - vFrom.z * vTo.y;
			this._y = vFrom.z * vTo.x - vFrom.x * vTo.z;
			this._z = vFrom.x * vTo.y - vFrom.y * vTo.x;
			this._w = r;

		}

		return this.normalize();

	}

	/**
	 * Returns the angle between this quaternion and the given one in radians.
	 *
	 * @param {Quaternion} q - The quaternion to compute the angle with.
	 * @return {number} The angle in radians.
	 */
	angleTo( q ) {

		return 2 * Math.acos( Math.abs( clamp( this.dot( q ), -1, 1 ) ) );

	}

	/**
	 * Rotates this quaternion by a given angular step to the given quaternion.
	 * The method ensures that the final quaternion will not overshoot `q`.
	 *
	 * @param {Quaternion} q - The target quaternion.
	 * @param {number} step - The angular step in radians.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	rotateTowards( q, step ) {

		const angle = this.angleTo( q );

		if ( angle === 0 ) return this;

		const t = Math.min( 1, step / angle );

		this.slerp( q, t );

		return this;

	}

	/**
	 * Sets this quaternion to the identity quaternion; that is, to the
	 * quaternion that represents "no rotation".
	 *
	 * @return {Quaternion} A reference to this quaternion.
	 */
	identity() {

		return this.set( 0, 0, 0, 1 );

	}

	/**
	 * Inverts this quaternion via {@link Quaternion#conjugate}. The
	 * quaternion is assumed to have unit length.
	 *
	 * @return {Quaternion} A reference to this quaternion.
	 */
	invert() {

		return this.conjugate();

	}

	/**
	 * Returns the rotational conjugate of this quaternion. The conjugate of a
	 * quaternion represents the same rotation in the opposite direction about
	 * the rotational axis.
	 *
	 * @return {Quaternion} A reference to this quaternion.
	 */
	conjugate() {

		this._x *= -1;
		this._y *= -1;
		this._z *= -1;

		this._onChangeCallback();

		return this;

	}

	/**
	 * Calculates the dot product of this quaternion and the given one.
	 *
	 * @param {Quaternion} v - The quaternion to compute the dot product with.
	 * @return {number} The result of the dot product.
	 */
	dot( v ) {

		return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;

	}

	/**
	 * Computes the squared Euclidean length (straight-line length) of this quaternion,
	 * considered as a 4 dimensional vector. This can be useful if you are comparing the
	 * lengths of two quaternions, as this is a slightly more efficient calculation than
	 * {@link Quaternion#length}.
	 *
	 * @return {number} The squared Euclidean length.
	 */
	lengthSq() {

		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;

	}

	/**
	 * Computes the Euclidean length (straight-line length) of this quaternion,
	 * considered as a 4 dimensional vector.
	 *
	 * @return {number} The Euclidean length.
	 */
	length() {

		return Math.sqrt( this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w );

	}

	/**
	 * Normalizes this quaternion - that is, calculated the quaternion that performs
	 * the same rotation as this one, but has a length equal to `1`.
	 *
	 * @return {Quaternion} A reference to this quaternion.
	 */
	normalize() {

		let l = this.length();

		if ( l === 0 ) {

			this._x = 0;
			this._y = 0;
			this._z = 0;
			this._w = 1;

		} else {

			l = 1 / l;

			this._x = this._x * l;
			this._y = this._y * l;
			this._z = this._z * l;
			this._w = this._w * l;

		}

		this._onChangeCallback();

		return this;

	}

	/**
	 * Multiplies this quaternion by the given one.
	 *
	 * @param {Quaternion} q - The quaternion.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	multiply( q ) {

		return this.multiplyQuaternions( this, q );

	}

	/**
	 * Pre-multiplies this quaternion by the given one.
	 *
	 * @param {Quaternion} q - The quaternion.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	premultiply( q ) {

		return this.multiplyQuaternions( q, this );

	}

	/**
	 * Multiplies the given quaternions and stores the result in this instance.
	 *
	 * @param {Quaternion} a - The first quaternion.
	 * @param {Quaternion} b - The second quaternion.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	multiplyQuaternions( a, b ) {

		// from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

		const qax = a._x, qay = a._y, qaz = a._z, qaw = a._w;
		const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;

		this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
		this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
		this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
		this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

		this._onChangeCallback();

		return this;

	}

	/**
	 * Performs a spherical linear interpolation between quaternions.
	 *
	 * @param {Quaternion} qb - The target quaternion.
	 * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	slerp( qb, t ) {

		if ( t === 0 ) return this;
		if ( t === 1 ) return this.copy( qb );

		const x = this._x, y = this._y, z = this._z, w = this._w;

		// http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

		let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

		if ( cosHalfTheta < 0 ) {

			this._w = - qb._w;
			this._x = - qb._x;
			this._y = - qb._y;
			this._z = - qb._z;

			cosHalfTheta = - cosHalfTheta;

		} else {

			this.copy( qb );

		}

		if ( cosHalfTheta >= 1.0 ) {

			this._w = w;
			this._x = x;
			this._y = y;
			this._z = z;

			return this;

		}

		const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

		if ( sqrSinHalfTheta <= Number.EPSILON ) {

			const s = 1 - t;
			this._w = s * w + t * this._w;
			this._x = s * x + t * this._x;
			this._y = s * y + t * this._y;
			this._z = s * z + t * this._z;

			this.normalize(); // normalize calls _onChangeCallback()

			return this;

		}

		const sinHalfTheta = Math.sqrt( sqrSinHalfTheta );
		const halfTheta = Math.atan2( sinHalfTheta, cosHalfTheta );
		const ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta,
			ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;

		this._w = ( w * ratioA + this._w * ratioB );
		this._x = ( x * ratioA + this._x * ratioB );
		this._y = ( y * ratioA + this._y * ratioB );
		this._z = ( z * ratioA + this._z * ratioB );

		this._onChangeCallback();

		return this;

	}

	/**
	 * Performs a spherical linear interpolation between the given quaternions
	 * and stores the result in this quaternion.
	 *
	 * @param {Quaternion} qa - The source quaternion.
	 * @param {Quaternion} qb - The target quaternion.
	 * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	slerpQuaternions( qa, qb, t ) {

		return this.copy( qa ).slerp( qb, t );

	}

	/**
	 * Sets this quaternion to a uniformly random, normalized quaternion.
	 *
	 * @return {Quaternion} A reference to this quaternion.
	 */
	random() {

		// Ken Shoemake
		// Uniform random rotations
		// D. Kirk, editor, Graphics Gems III, pages 124-132. Academic Press, New York, 1992.

		const theta1 = 2 * Math.PI * Math.random();
		const theta2 = 2 * Math.PI * Math.random();

		const x0 = Math.random();
		const r1 = Math.sqrt( 1 - x0 );
		const r2 = Math.sqrt( x0 );

		return this.set(
			r1 * Math.sin( theta1 ),
			r1 * Math.cos( theta1 ),
			r2 * Math.sin( theta2 ),
			r2 * Math.cos( theta2 ),
		);

	}

	/**
	 * Returns `true` if this quaternion is equal with the given one.
	 *
	 * @param {Quaternion} quaternion - The quaternion to test for equality.
	 * @return {boolean} Whether this quaternion is equal with the given one.
	 */
	equals( quaternion ) {

		return ( quaternion._x === this._x ) && ( quaternion._y === this._y ) && ( quaternion._z === this._z ) && ( quaternion._w === this._w );

	}

	/**
	 * Sets this quaternion's components from the given array.
	 *
	 * @param {Array<number>} array - An array holding the quaternion component values.
	 * @param {number} [offset=0] - The offset into the array.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	fromArray( array, offset = 0 ) {

		this._x = array[ offset ];
		this._y = array[ offset + 1 ];
		this._z = array[ offset + 2 ];
		this._w = array[ offset + 3 ];

		this._onChangeCallback();

		return this;

	}

	/**
	 * Writes the components of this quaternion to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number>} [array=[]] - The target array holding the quaternion components.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number>} The quaternion components.
	 */
	toArray( array = [], offset = 0 ) {

		array[ offset ] = this._x;
		array[ offset + 1 ] = this._y;
		array[ offset + 2 ] = this._z;
		array[ offset + 3 ] = this._w;

		return array;

	}

	/**
	 * Sets the components of this quaternion from the given buffer attribute.
	 *
	 * @param {BufferAttribute} attribute - The buffer attribute holding quaternion data.
	 * @param {number} index - The index into the attribute.
	 * @return {Quaternion} A reference to this quaternion.
	 */
	fromBufferAttribute( attribute, index ) {

		this._x = attribute.getX( index );
		this._y = attribute.getY( index );
		this._z = attribute.getZ( index );
		this._w = attribute.getW( index );

		this._onChangeCallback();

		return this;

	}

	/**
	 * This methods defines the serialization result of this class. Returns the
	 * numerical elements of this quaternion in an array of format `[x, y, z, w]`.
	 *
	 * @return {Array<number>} The serialized quaternion.
	 */
	toJSON() {

		return this.toArray();

	}

	_onChange( callback ) {

		this._onChangeCallback = callback;

		return this;

	}

	_onChangeCallback() {}

	*[ Symbol.iterator ]() {

		yield this._x;
		yield this._y;
		yield this._z;
		yield this._w;

	}

}

/**
 * Class representing a 3D vector. A 3D vector is an ordered triplet of numbers
 * (labeled x, y and z), which can be used to represent a number of things, such as:
 *
 * - A point in 3D space.
 * - A direction and length in 3D space. In three.js the length will
 * always be the Euclidean distance(straight-line distance) from `(0, 0, 0)` to `(x, y, z)`
 * and the direction is also measured from `(0, 0, 0)` towards `(x, y, z)`.
 * - Any arbitrary ordered triplet of numbers.
 *
 * There are other things a 3D vector can be used to represent, such as
 * momentum vectors and so on, however these are the most
 * common uses in three.js.
 *
 * Iterating through a vector instance will yield its components `(x, y, z)` in
 * the corresponding order.
 * ```js
 * const a = new THREE.Vector3( 0, 1, 0 );
 *
 * //no arguments; will be initialised to (0, 0, 0)
 * const b = new THREE.Vector3( );
 *
 * const d = a.distanceTo( b );
 * ```
 */
class Vector3 {

	/**
	 * Constructs a new 3D vector.
	 *
	 * @param {number} [x=0] - The x value of this vector.
	 * @param {number} [y=0] - The y value of this vector.
	 * @param {number} [z=0] - The z value of this vector.
	 */
	constructor( x = 0, y = 0, z = 0 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		Vector3.prototype.isVector3 = true;

		/**
		 * The x value of this vector.
		 *
		 * @type {number}
		 */
		this.x = x;

		/**
		 * The y value of this vector.
		 *
		 * @type {number}
		 */
		this.y = y;

		/**
		 * The z value of this vector.
		 *
		 * @type {number}
		 */
		this.z = z;

	}

	/**
	 * Sets the vector components.
	 *
	 * @param {number} x - The value of the x component.
	 * @param {number} y - The value of the y component.
	 * @param {number} z - The value of the z component.
	 * @return {Vector3} A reference to this vector.
	 */
	set( x, y, z ) {

		if ( z === undefined ) z = this.z; // sprite.scale.set(x,y)

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	}

	/**
	 * Sets the vector components to the same value.
	 *
	 * @param {number} scalar - The value to set for all vector components.
	 * @return {Vector3} A reference to this vector.
	 */
	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;
		this.z = scalar;

		return this;

	}

	/**
	 * Sets the vector's x component to the given value
	 *
	 * @param {number} x - The value to set.
	 * @return {Vector3} A reference to this vector.
	 */
	setX( x ) {

		this.x = x;

		return this;

	}

	/**
	 * Sets the vector's y component to the given value
	 *
	 * @param {number} y - The value to set.
	 * @return {Vector3} A reference to this vector.
	 */
	setY( y ) {

		this.y = y;

		return this;

	}

	/**
	 * Sets the vector's z component to the given value
	 *
	 * @param {number} z - The value to set.
	 * @return {Vector3} A reference to this vector.
	 */
	setZ( z ) {

		this.z = z;

		return this;

	}

	/**
	 * Allows to set a vector component with an index.
	 *
	 * @param {number} index - The component index. `0` equals to x, `1` equals to y, `2` equals to z.
	 * @param {number} value - The value to set.
	 * @return {Vector3} A reference to this vector.
	 */
	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			case 2: this.z = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

	/**
	 * Returns the value of the vector component which matches the given index.
	 *
	 * @param {number} index - The component index. `0` equals to x, `1` equals to y, `2` equals to z.
	 * @return {number} A vector component value.
	 */
	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

	/**
	 * Returns a new vector with copied values from this instance.
	 *
	 * @return {Vector3} A clone of this instance.
	 */
	clone() {

		return new this.constructor( this.x, this.y, this.z );

	}

	/**
	 * Copies the values of the given vector to this instance.
	 *
	 * @param {Vector3} v - The vector to copy.
	 * @return {Vector3} A reference to this vector.
	 */
	copy( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;

		return this;

	}

	/**
	 * Adds the given vector to this instance.
	 *
	 * @param {Vector3} v - The vector to add.
	 * @return {Vector3} A reference to this vector.
	 */
	add( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	}

	/**
	 * Adds the given scalar value to all components of this instance.
	 *
	 * @param {number} s - The scalar to add.
	 * @return {Vector3} A reference to this vector.
	 */
	addScalar( s ) {

		this.x += s;
		this.y += s;
		this.z += s;

		return this;

	}

	/**
	 * Adds the given vectors and stores the result in this instance.
	 *
	 * @param {Vector3} a - The first vector.
	 * @param {Vector3} b - The second vector.
	 * @return {Vector3} A reference to this vector.
	 */
	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;

	}

	/**
	 * Adds the given vector scaled by the given factor to this instance.
	 *
	 * @param {Vector3|Vector4} v - The vector.
	 * @param {number} s - The factor that scales `v`.
	 * @return {Vector3} A reference to this vector.
	 */
	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;
		this.z += v.z * s;

		return this;

	}

	/**
	 * Subtracts the given vector from this instance.
	 *
	 * @param {Vector3} v - The vector to subtract.
	 * @return {Vector3} A reference to this vector.
	 */
	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	}

	/**
	 * Subtracts the given scalar value from all components of this instance.
	 *
	 * @param {number} s - The scalar to subtract.
	 * @return {Vector3} A reference to this vector.
	 */
	subScalar( s ) {

		this.x -= s;
		this.y -= s;
		this.z -= s;

		return this;

	}

	/**
	 * Subtracts the given vectors and stores the result in this instance.
	 *
	 * @param {Vector3} a - The first vector.
	 * @param {Vector3} b - The second vector.
	 * @return {Vector3} A reference to this vector.
	 */
	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;

		return this;

	}

	/**
	 * Multiplies the given vector with this instance.
	 *
	 * @param {Vector3} v - The vector to multiply.
	 * @return {Vector3} A reference to this vector.
	 */
	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;

		return this;

	}

	/**
	 * Multiplies the given scalar value with all components of this instance.
	 *
	 * @param {number} scalar - The scalar to multiply.
	 * @return {Vector3} A reference to this vector.
	 */
	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;

		return this;

	}

	/**
	 * Multiplies the given vectors and stores the result in this instance.
	 *
	 * @param {Vector3} a - The first vector.
	 * @param {Vector3} b - The second vector.
	 * @return {Vector3} A reference to this vector.
	 */
	multiplyVectors( a, b ) {

		this.x = a.x * b.x;
		this.y = a.y * b.y;
		this.z = a.z * b.z;

		return this;

	}

	/**
	 * Applies the given Euler rotation to this vector.
	 *
	 * @param {Euler} euler - The Euler angles.
	 * @return {Vector3} A reference to this vector.
	 */
	applyEuler( euler ) {

		return this.applyQuaternion( _quaternion$4.setFromEuler( euler ) );

	}

	/**
	 * Applies a rotation specified by an axis and an angle to this vector.
	 *
	 * @param {Vector3} axis - A normalized vector representing the rotation axis.
	 * @param {number} angle - The angle in radians.
	 * @return {Vector3} A reference to this vector.
	 */
	applyAxisAngle( axis, angle ) {

		return this.applyQuaternion( _quaternion$4.setFromAxisAngle( axis, angle ) );

	}

	/**
	 * Multiplies this vector with the given 3x3 matrix.
	 *
	 * @param {Matrix3} m - The 3x3 matrix.
	 * @return {Vector3} A reference to this vector.
	 */
	applyMatrix3( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ] * z;
		this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ] * z;
		this.z = e[ 2 ] * x + e[ 5 ] * y + e[ 8 ] * z;

		return this;

	}

	/**
	 * Multiplies this vector by the given normal matrix and normalizes
	 * the result.
	 *
	 * @param {Matrix3} m - The normal matrix.
	 * @return {Vector3} A reference to this vector.
	 */
	applyNormalMatrix( m ) {

		return this.applyMatrix3( m ).normalize();

	}

	/**
	 * Multiplies this vector (with an implicit 1 in the 4th dimension) by m, and
	 * divides by perspective.
	 *
	 * @param {Matrix4} m - The matrix to apply.
	 * @return {Vector3} A reference to this vector.
	 */
	applyMatrix4( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		const w = 1 / ( e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] );

		this.x = ( e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] ) * w;
		this.y = ( e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] ) * w;
		this.z = ( e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] ) * w;

		return this;

	}

	/**
	 * Applies the given Quaternion to this vector.
	 *
	 * @param {Quaternion} q - The Quaternion.
	 * @return {Vector3} A reference to this vector.
	 */
	applyQuaternion( q ) {

		// quaternion q is assumed to have unit length

		const vx = this.x, vy = this.y, vz = this.z;
		const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

		// t = 2 * cross( q.xyz, v );
		const tx = 2 * ( qy * vz - qz * vy );
		const ty = 2 * ( qz * vx - qx * vz );
		const tz = 2 * ( qx * vy - qy * vx );

		// v + q.w * t + cross( q.xyz, t );
		this.x = vx + qw * tx + qy * tz - qz * ty;
		this.y = vy + qw * ty + qz * tx - qx * tz;
		this.z = vz + qw * tz + qx * ty - qy * tx;

		return this;

	}

	/**
	 * Projects this vector from world space into the camera's normalized
	 * device coordinate (NDC) space.
	 *
	 * @param {Camera} camera - The camera.
	 * @return {Vector3} A reference to this vector.
	 */
	project( camera ) {

		return this.applyMatrix4( camera.matrixWorldInverse ).applyMatrix4( camera.projectionMatrix );

	}

	/**
	 * Unprojects this vector from the camera's normalized device coordinate (NDC)
	 * space into world space.
	 *
	 * @param {Camera} camera - The camera.
	 * @return {Vector3} A reference to this vector.
	 */
	unproject( camera ) {

		return this.applyMatrix4( camera.projectionMatrixInverse ).applyMatrix4( camera.matrixWorld );

	}

	/**
	 * Transforms the direction of this vector by a matrix (the upper left 3 x 3
	 * subset of the given 4x4 matrix and then normalizes the result.
	 *
	 * @param {Matrix4} m - The matrix.
	 * @return {Vector3} A reference to this vector.
	 */
	transformDirection( m ) {

		// input: THREE.Matrix4 affine matrix
		// vector interpreted as a direction

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		return this.normalize();

	}

	/**
	 * Divides this instance by the given vector.
	 *
	 * @param {Vector3} v - The vector to divide.
	 * @return {Vector3} A reference to this vector.
	 */
	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;

		return this;

	}

	/**
	 * Divides this vector by the given scalar.
	 *
	 * @param {number} scalar - The scalar to divide.
	 * @return {Vector3} A reference to this vector.
	 */
	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

	/**
	 * If this vector's x, y or z value is greater than the given vector's x, y or z
	 * value, replace that value with the corresponding min value.
	 *
	 * @param {Vector3} v - The vector.
	 * @return {Vector3} A reference to this vector.
	 */
	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );

		return this;

	}

	/**
	 * If this vector's x, y or z value is less than the given vector's x, y or z
	 * value, replace that value with the corresponding max value.
	 *
	 * @param {Vector3} v - The vector.
	 * @return {Vector3} A reference to this vector.
	 */
	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );

		return this;

	}

	/**
	 * If this vector's x, y or z value is greater than the max vector's x, y or z
	 * value, it is replaced by the corresponding value.
	 * If this vector's x, y or z value is less than the min vector's x, y or z value,
	 * it is replaced by the corresponding value.
	 *
	 * @param {Vector3} min - The minimum x, y and z values.
	 * @param {Vector3} max - The maximum x, y and z values in the desired range.
	 * @return {Vector3} A reference to this vector.
	 */
	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = clamp( this.x, min.x, max.x );
		this.y = clamp( this.y, min.y, max.y );
		this.z = clamp( this.z, min.z, max.z );

		return this;

	}

	/**
	 * If this vector's x, y or z values are greater than the max value, they are
	 * replaced by the max value.
	 * If this vector's x, y or z values are less than the min value, they are
	 * replaced by the min value.
	 *
	 * @param {number} minVal - The minimum value the components will be clamped to.
	 * @param {number} maxVal - The maximum value the components will be clamped to.
	 * @return {Vector3} A reference to this vector.
	 */
	clampScalar( minVal, maxVal ) {

		this.x = clamp( this.x, minVal, maxVal );
		this.y = clamp( this.y, minVal, maxVal );
		this.z = clamp( this.z, minVal, maxVal );

		return this;

	}

	/**
	 * If this vector's length is greater than the max value, it is replaced by
	 * the max value.
	 * If this vector's length is less than the min value, it is replaced by the
	 * min value.
	 *
	 * @param {number} min - The minimum value the vector length will be clamped to.
	 * @param {number} max - The maximum value the vector length will be clamped to.
	 * @return {Vector3} A reference to this vector.
	 */
	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( clamp( length, min, max ) );

	}

	/**
	 * The components of this vector are rounded down to the nearest integer value.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );
		this.z = Math.floor( this.z );

		return this;

	}

	/**
	 * The components of this vector are rounded up to the nearest integer value.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );
		this.z = Math.ceil( this.z );

		return this;

	}

	/**
	 * The components of this vector are rounded to the nearest integer value
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );
		this.z = Math.round( this.z );

		return this;

	}

	/**
	 * The components of this vector are rounded towards zero (up if negative,
	 * down if positive) to an integer value.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	roundToZero() {

		this.x = Math.trunc( this.x );
		this.y = Math.trunc( this.y );
		this.z = Math.trunc( this.z );

		return this;

	}

	/**
	 * Inverts this vector - i.e. sets x = -x, y = -y and z = -z.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	negate() {

		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;

		return this;

	}

	/**
	 * Calculates the dot product of the given vector with this instance.
	 *
	 * @param {Vector3} v - The vector to compute the dot product with.
	 * @return {number} The result of the dot product.
	 */
	dot( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z;

	}

	// TODO lengthSquared?

	/**
	 * Computes the square of the Euclidean length (straight-line length) from
	 * (0, 0, 0) to (x, y, z). If you are comparing the lengths of vectors, you should
	 * compare the length squared instead as it is slightly more efficient to calculate.
	 *
	 * @return {number} The square length of this vector.
	 */
	lengthSq() {

		return this.x * this.x + this.y * this.y + this.z * this.z;

	}

	/**
	 * Computes the  Euclidean length (straight-line length) from (0, 0, 0) to (x, y, z).
	 *
	 * @return {number} The length of this vector.
	 */
	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	}

	/**
	 * Computes the Manhattan length of this vector.
	 *
	 * @return {number} The length of this vector.
	 */
	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z );

	}

	/**
	 * Converts this vector to a unit vector - that is, sets it equal to a vector
	 * with the same direction as this one, but with a vector length of `1`.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	/**
	 * Sets this vector to a vector with the same direction as this one, but
	 * with the specified length.
	 *
	 * @param {number} length - The new length of this vector.
	 * @return {Vector3} A reference to this vector.
	 */
	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

	/**
	 * Linearly interpolates between the given vector and this instance, where
	 * alpha is the percent distance along the line - alpha = 0 will be this
	 * vector, and alpha = 1 will be the given one.
	 *
	 * @param {Vector3} v - The vector to interpolate towards.
	 * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
	 * @return {Vector3} A reference to this vector.
	 */
	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;
		this.z += ( v.z - this.z ) * alpha;

		return this;

	}

	/**
	 * Linearly interpolates between the given vectors, where alpha is the percent
	 * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
	 * be the second one. The result is stored in this instance.
	 *
	 * @param {Vector3} v1 - The first vector.
	 * @param {Vector3} v2 - The second vector.
	 * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
	 * @return {Vector3} A reference to this vector.
	 */
	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;
		this.z = v1.z + ( v2.z - v1.z ) * alpha;

		return this;

	}

	/**
	 * Calculates the cross product of the given vector with this instance.
	 *
	 * @param {Vector3} v - The vector to compute the cross product with.
	 * @return {Vector3} The result of the cross product.
	 */
	cross( v ) {

		return this.crossVectors( this, v );

	}

	/**
	 * Calculates the cross product of the given vectors and stores the result
	 * in this instance.
	 *
	 * @param {Vector3} a - The first vector.
	 * @param {Vector3} b - The second vector.
	 * @return {Vector3} A reference to this vector.
	 */
	crossVectors( a, b ) {

		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;

	}

	/**
	 * Projects this vector onto the given one.
	 *
	 * @param {Vector3} v - The vector to project to.
	 * @return {Vector3} A reference to this vector.
	 */
	projectOnVector( v ) {

		const denominator = v.lengthSq();

		if ( denominator === 0 ) return this.set( 0, 0, 0 );

		const scalar = v.dot( this ) / denominator;

		return this.copy( v ).multiplyScalar( scalar );

	}

	/**
	 * Projects this vector onto a plane by subtracting this
	 * vector projected onto the plane's normal from this vector.
	 *
	 * @param {Vector3} planeNormal - The plane normal.
	 * @return {Vector3} A reference to this vector.
	 */
	projectOnPlane( planeNormal ) {

		_vector$c.copy( this ).projectOnVector( planeNormal );

		return this.sub( _vector$c );

	}

	/**
	 * Reflects this vector off a plane orthogonal to the given normal vector.
	 *
	 * @param {Vector3} normal - The (normalized) normal vector.
	 * @return {Vector3} A reference to this vector.
	 */
	reflect( normal ) {

		return this.sub( _vector$c.copy( normal ).multiplyScalar( 2 * this.dot( normal ) ) );

	}
	/**
	 * Returns the angle between the given vector and this instance in radians.
	 *
	 * @param {Vector3} v - The vector to compute the angle with.
	 * @return {number} The angle in radians.
	 */
	angleTo( v ) {

		const denominator = Math.sqrt( this.lengthSq() * v.lengthSq() );

		if ( denominator === 0 ) return Math.PI / 2;

		const theta = this.dot( v ) / denominator;

		// clamp, to handle numerical problems

		return Math.acos( clamp( theta, -1, 1 ) );

	}

	/**
	 * Computes the distance from the given vector to this instance.
	 *
	 * @param {Vector3} v - The vector to compute the distance to.
	 * @return {number} The distance.
	 */
	distanceTo( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	}

	/**
	 * Computes the squared distance from the given vector to this instance.
	 * If you are just comparing the distance with another distance, you should compare
	 * the distance squared instead as it is slightly more efficient to calculate.
	 *
	 * @param {Vector3} v - The vector to compute the squared distance to.
	 * @return {number} The squared distance.
	 */
	distanceToSquared( v ) {

		const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;

		return dx * dx + dy * dy + dz * dz;

	}

	/**
	 * Computes the Manhattan distance from the given vector to this instance.
	 *
	 * @param {Vector3} v - The vector to compute the Manhattan distance to.
	 * @return {number} The Manhattan distance.
	 */
	manhattanDistanceTo( v ) {

		return Math.abs( this.x - v.x ) + Math.abs( this.y - v.y ) + Math.abs( this.z - v.z );

	}

	/**
	 * Sets the vector components from the given spherical coordinates.
	 *
	 * @param {Spherical} s - The spherical coordinates.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromSpherical( s ) {

		return this.setFromSphericalCoords( s.radius, s.phi, s.theta );

	}

	/**
	 * Sets the vector components from the given spherical coordinates.
	 *
	 * @param {number} radius - The radius.
	 * @param {number} phi - The phi angle in radians.
	 * @param {number} theta - The theta angle in radians.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromSphericalCoords( radius, phi, theta ) {

		const sinPhiRadius = Math.sin( phi ) * radius;

		this.x = sinPhiRadius * Math.sin( theta );
		this.y = Math.cos( phi ) * radius;
		this.z = sinPhiRadius * Math.cos( theta );

		return this;

	}

	/**
	 * Sets the vector components from the given cylindrical coordinates.
	 *
	 * @param {Cylindrical} c - The cylindrical coordinates.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromCylindrical( c ) {

		return this.setFromCylindricalCoords( c.radius, c.theta, c.y );

	}

	/**
	 * Sets the vector components from the given cylindrical coordinates.
	 *
	 * @param {number} radius - The radius.
	 * @param {number} theta - The theta angle in radians.
	 * @param {number} y - The y value.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromCylindricalCoords( radius, theta, y ) {

		this.x = radius * Math.sin( theta );
		this.y = y;
		this.z = radius * Math.cos( theta );

		return this;

	}

	/**
	 * Sets the vector components to the position elements of the
	 * given transformation matrix.
	 *
	 * @param {Matrix4} m - The 4x4 matrix.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromMatrixPosition( m ) {

		const e = m.elements;

		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];

		return this;

	}

	/**
	 * Sets the vector components to the scale elements of the
	 * given transformation matrix.
	 *
	 * @param {Matrix4} m - The 4x4 matrix.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromMatrixScale( m ) {

		const sx = this.setFromMatrixColumn( m, 0 ).length();
		const sy = this.setFromMatrixColumn( m, 1 ).length();
		const sz = this.setFromMatrixColumn( m, 2 ).length();

		this.x = sx;
		this.y = sy;
		this.z = sz;

		return this;

	}

	/**
	 * Sets the vector components from the specified matrix column.
	 *
	 * @param {Matrix4} m - The 4x4 matrix.
	 * @param {number} index - The column index.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromMatrixColumn( m, index ) {

		return this.fromArray( m.elements, index * 4 );

	}

	/**
	 * Sets the vector components from the specified matrix column.
	 *
	 * @param {Matrix3} m - The 3x3 matrix.
	 * @param {number} index - The column index.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromMatrix3Column( m, index ) {

		return this.fromArray( m.elements, index * 3 );

	}

	/**
	 * Sets the vector components from the given Euler angles.
	 *
	 * @param {Euler} e - The Euler angles to set.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromEuler( e ) {

		this.x = e._x;
		this.y = e._y;
		this.z = e._z;

		return this;

	}

	/**
	 * Sets the vector components from the RGB components of the
	 * given color.
	 *
	 * @param {Color} c - The color to set.
	 * @return {Vector3} A reference to this vector.
	 */
	setFromColor( c ) {

		this.x = c.r;
		this.y = c.g;
		this.z = c.b;

		return this;

	}

	/**
	 * Returns `true` if this vector is equal with the given one.
	 *
	 * @param {Vector3} v - The vector to test for equality.
	 * @return {boolean} Whether this vector is equal with the given one.
	 */
	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

	}

	/**
	 * Sets this vector's x value to be `array[ offset ]`, y value to be `array[ offset + 1 ]`
	 * and z value to be `array[ offset + 2 ]`.
	 *
	 * @param {Array<number>} array - An array holding the vector component values.
	 * @param {number} [offset=0] - The offset into the array.
	 * @return {Vector3} A reference to this vector.
	 */
	fromArray( array, offset = 0 ) {

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];

		return this;

	}

	/**
	 * Writes the components of this vector to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number>} [array=[]] - The target array holding the vector components.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number>} The vector components.
	 */
	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;

		return array;

	}

	/**
	 * Sets the components of this vector from the given buffer attribute.
	 *
	 * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
	 * @param {number} index - The index into the attribute.
	 * @return {Vector3} A reference to this vector.
	 */
	fromBufferAttribute( attribute, index ) {

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );
		this.z = attribute.getZ( index );

		return this;

	}

	/**
	 * Sets each component of this vector to a pseudo-random value between `0` and
	 * `1`, excluding `1`.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	random() {

		this.x = Math.random();
		this.y = Math.random();
		this.z = Math.random();

		return this;

	}

	/**
	 * Sets this vector to a uniformly random point on a unit sphere.
	 *
	 * @return {Vector3} A reference to this vector.
	 */
	randomDirection() {

		// https://mathworld.wolfram.com/SpherePointPicking.html

		const theta = Math.random() * Math.PI * 2;
		const u = Math.random() * 2 - 1;
		const c = Math.sqrt( 1 - u * u );

		this.x = c * Math.cos( theta );
		this.y = u;
		this.z = c * Math.sin( theta );

		return this;

	}

	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;
		yield this.z;

	}

}

const _vector$c = /*@__PURE__*/ new Vector3();
const _quaternion$4 = /*@__PURE__*/ new Quaternion();

/**
 * Represents a 3x3 matrix.
 *
 * A Note on Row-Major and Column-Major Ordering:
 *
 * The constructor and {@link Matrix3#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix3#elements} array in column-major order.
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix();
 * m.set( 11, 12, 13,
 *        21, 22, 23,
 *        31, 32, 33 );
 * ```
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21, 31,
 *                12, 22, 32,
 *                13, 23, 33 ];
 * ```
 * and internally all calculations are performed using column-major ordering.
 * However, as the actual ordering makes no difference mathematically and
 * most people are used to thinking about matrices in row-major order, the
 * three.js documentation shows matrices in row-major order. Just bear in
 * mind that if you are reading the source code, you'll have to take the
 * transpose of any matrices outlined here to make sense of the calculations.
 */
class Matrix3 {

	/**
	 * Constructs a new 3x3 matrix. The arguments are supposed to be
	 * in row-major order. If no arguments are provided, the constructor
	 * initializes the matrix as an identity matrix.
	 *
	 * @param {number} [n11] - 1-1 matrix element.
	 * @param {number} [n12] - 1-2 matrix element.
	 * @param {number} [n13] - 1-3 matrix element.
	 * @param {number} [n21] - 2-1 matrix element.
	 * @param {number} [n22] - 2-2 matrix element.
	 * @param {number} [n23] - 2-3 matrix element.
	 * @param {number} [n31] - 3-1 matrix element.
	 * @param {number} [n32] - 3-2 matrix element.
	 * @param {number} [n33] - 3-3 matrix element.
	 */
	constructor( n11, n12, n13, n21, n22, n23, n31, n32, n33 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		Matrix3.prototype.isMatrix3 = true;

		/**
		 * A column-major list of matrix values.
		 *
		 * @type {Array<number>}
		 */
		this.elements = [

			1, 0, 0,
			0, 1, 0,
			0, 0, 1

		];

		if ( n11 !== undefined ) {

			this.set( n11, n12, n13, n21, n22, n23, n31, n32, n33 );

		}

	}

	/**
	 * Sets the elements of the matrix.The arguments are supposed to be
	 * in row-major order.
	 *
	 * @param {number} [n11] - 1-1 matrix element.
	 * @param {number} [n12] - 1-2 matrix element.
	 * @param {number} [n13] - 1-3 matrix element.
	 * @param {number} [n21] - 2-1 matrix element.
	 * @param {number} [n22] - 2-2 matrix element.
	 * @param {number} [n23] - 2-3 matrix element.
	 * @param {number} [n31] - 3-1 matrix element.
	 * @param {number} [n32] - 3-2 matrix element.
	 * @param {number} [n33] - 3-3 matrix element.
	 * @return {Matrix3} A reference to this matrix.
	 */
	set( n11, n12, n13, n21, n22, n23, n31, n32, n33 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 1 ] = n21; te[ 2 ] = n31;
		te[ 3 ] = n12; te[ 4 ] = n22; te[ 5 ] = n32;
		te[ 6 ] = n13; te[ 7 ] = n23; te[ 8 ] = n33;

		return this;

	}

	/**
	 * Sets this matrix to the 3x3 identity matrix.
	 *
	 * @return {Matrix3} A reference to this matrix.
	 */
	identity() {

		this.set(

			1, 0, 0,
			0, 1, 0,
			0, 0, 1

		);

		return this;

	}

	/**
	 * Copies the values of the given matrix to this instance.
	 *
	 * @param {Matrix3} m - The matrix to copy.
	 * @return {Matrix3} A reference to this matrix.
	 */
	copy( m ) {

		const te = this.elements;
		const me = m.elements;

		te[ 0 ] = me[ 0 ]; te[ 1 ] = me[ 1 ]; te[ 2 ] = me[ 2 ];
		te[ 3 ] = me[ 3 ]; te[ 4 ] = me[ 4 ]; te[ 5 ] = me[ 5 ];
		te[ 6 ] = me[ 6 ]; te[ 7 ] = me[ 7 ]; te[ 8 ] = me[ 8 ];

		return this;

	}

	/**
	 * Extracts the basis of this matrix into the three axis vectors provided.
	 *
	 * @param {Vector3} xAxis - The basis's x axis.
	 * @param {Vector3} yAxis - The basis's y axis.
	 * @param {Vector3} zAxis - The basis's z axis.
	 * @return {Matrix3} A reference to this matrix.
	 */
	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.setFromMatrix3Column( this, 0 );
		yAxis.setFromMatrix3Column( this, 1 );
		zAxis.setFromMatrix3Column( this, 2 );

		return this;

	}

	/**
	 * Set this matrix to the upper 3x3 matrix of the given 4x4 matrix.
	 *
	 * @param {Matrix4} m - The 4x4 matrix.
	 * @return {Matrix3} A reference to this matrix.
	 */
	setFromMatrix4( m ) {

		const me = m.elements;

		this.set(

			me[ 0 ], me[ 4 ], me[ 8 ],
			me[ 1 ], me[ 5 ], me[ 9 ],
			me[ 2 ], me[ 6 ], me[ 10 ]

		);

		return this;

	}

	/**
	 * Post-multiplies this matrix by the given 3x3 matrix.
	 *
	 * @param {Matrix3} m - The matrix to multiply with.
	 * @return {Matrix3} A reference to this matrix.
	 */
	multiply( m ) {

		return this.multiplyMatrices( this, m );

	}

	/**
	 * Pre-multiplies this matrix by the given 3x3 matrix.
	 *
	 * @param {Matrix3} m - The matrix to multiply with.
	 * @return {Matrix3} A reference to this matrix.
	 */
	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	/**
	 * Multiples the given 3x3 matrices and stores the result
	 * in this matrix.
	 *
	 * @param {Matrix3} a - The first matrix.
	 * @param {Matrix3} b - The second matrix.
	 * @return {Matrix3} A reference to this matrix.
	 */
	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const te = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 3 ], a13 = ae[ 6 ];
		const a21 = ae[ 1 ], a22 = ae[ 4 ], a23 = ae[ 7 ];
		const a31 = ae[ 2 ], a32 = ae[ 5 ], a33 = ae[ 8 ];

		const b11 = be[ 0 ], b12 = be[ 3 ], b13 = be[ 6 ];
		const b21 = be[ 1 ], b22 = be[ 4 ], b23 = be[ 7 ];
		const b31 = be[ 2 ], b32 = be[ 5 ], b33 = be[ 8 ];

		te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31;
		te[ 3 ] = a11 * b12 + a12 * b22 + a13 * b32;
		te[ 6 ] = a11 * b13 + a12 * b23 + a13 * b33;

		te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31;
		te[ 4 ] = a21 * b12 + a22 * b22 + a23 * b32;
		te[ 7 ] = a21 * b13 + a22 * b23 + a23 * b33;

		te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31;
		te[ 5 ] = a31 * b12 + a32 * b22 + a33 * b32;
		te[ 8 ] = a31 * b13 + a32 * b23 + a33 * b33;

		return this;

	}

	/**
	 * Multiplies every component of the matrix by the given scalar.
	 *
	 * @param {number} s - The scalar.
	 * @return {Matrix3} A reference to this matrix.
	 */
	multiplyScalar( s ) {

		const te = this.elements;

		te[ 0 ] *= s; te[ 3 ] *= s; te[ 6 ] *= s;
		te[ 1 ] *= s; te[ 4 ] *= s; te[ 7 ] *= s;
		te[ 2 ] *= s; te[ 5 ] *= s; te[ 8 ] *= s;

		return this;

	}

	/**
	 * Computes and returns the determinant of this matrix.
	 *
	 * @return {number} The determinant.
	 */
	determinant() {

		const te = this.elements;

		const a = te[ 0 ], b = te[ 1 ], c = te[ 2 ],
			d = te[ 3 ], e = te[ 4 ], f = te[ 5 ],
			g = te[ 6 ], h = te[ 7 ], i = te[ 8 ];

		return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;

	}

	/**
	 * Inverts this matrix, using the [analytic method]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}.
	 * You can not invert with a determinant of zero. If you attempt this, the method produces
	 * a zero matrix instead.
	 *
	 * @return {Matrix3} A reference to this matrix.
	 */
	invert() {

		const te = this.elements,

			n11 = te[ 0 ], n21 = te[ 1 ], n31 = te[ 2 ],
			n12 = te[ 3 ], n22 = te[ 4 ], n32 = te[ 5 ],
			n13 = te[ 6 ], n23 = te[ 7 ], n33 = te[ 8 ],

			t11 = n33 * n22 - n32 * n23,
			t12 = n32 * n13 - n33 * n12,
			t13 = n23 * n12 - n22 * n13,

			det = n11 * t11 + n21 * t12 + n31 * t13;

		if ( det === 0 ) return this.set( 0, 0, 0, 0, 0, 0, 0, 0, 0 );

		const detInv = 1 / det;

		te[ 0 ] = t11 * detInv;
		te[ 1 ] = ( n31 * n23 - n33 * n21 ) * detInv;
		te[ 2 ] = ( n32 * n21 - n31 * n22 ) * detInv;

		te[ 3 ] = t12 * detInv;
		te[ 4 ] = ( n33 * n11 - n31 * n13 ) * detInv;
		te[ 5 ] = ( n31 * n12 - n32 * n11 ) * detInv;

		te[ 6 ] = t13 * detInv;
		te[ 7 ] = ( n21 * n13 - n23 * n11 ) * detInv;
		te[ 8 ] = ( n22 * n11 - n21 * n12 ) * detInv;

		return this;

	}

	/**
	 * Transposes this matrix in place.
	 *
	 * @return {Matrix3} A reference to this matrix.
	 */
	transpose() {

		let tmp;
		const m = this.elements;

		tmp = m[ 1 ]; m[ 1 ] = m[ 3 ]; m[ 3 ] = tmp;
		tmp = m[ 2 ]; m[ 2 ] = m[ 6 ]; m[ 6 ] = tmp;
		tmp = m[ 5 ]; m[ 5 ] = m[ 7 ]; m[ 7 ] = tmp;

		return this;

	}

	/**
	 * Computes the normal matrix which is the inverse transpose of the upper
	 * left 3x3 portion of the given 4x4 matrix.
	 *
	 * @param {Matrix4} matrix4 - The 4x4 matrix.
	 * @return {Matrix3} A reference to this matrix.
	 */
	getNormalMatrix( matrix4 ) {

		return this.setFromMatrix4( matrix4 ).invert().transpose();

	}

	/**
	 * Transposes this matrix into the supplied array, and returns itself unchanged.
	 *
	 * @param {Array<number>} r - An array to store the transposed matrix elements.
	 * @return {Matrix3} A reference to this matrix.
	 */
	transposeIntoArray( r ) {

		const m = this.elements;

		r[ 0 ] = m[ 0 ];
		r[ 1 ] = m[ 3 ];
		r[ 2 ] = m[ 6 ];
		r[ 3 ] = m[ 1 ];
		r[ 4 ] = m[ 4 ];
		r[ 5 ] = m[ 7 ];
		r[ 6 ] = m[ 2 ];
		r[ 7 ] = m[ 5 ];
		r[ 8 ] = m[ 8 ];

		return this;

	}

	/**
	 * Sets the UV transform matrix from offset, repeat, rotation, and center.
	 *
	 * @param {number} tx - Offset x.
	 * @param {number} ty - Offset y.
	 * @param {number} sx - Repeat x.
	 * @param {number} sy - Repeat y.
	 * @param {number} rotation - Rotation, in radians. Positive values rotate counterclockwise.
	 * @param {number} cx - Center x of rotation.
	 * @param {number} cy - Center y of rotation
	 * @return {Matrix3} A reference to this matrix.
	 */
	setUvTransform( tx, ty, sx, sy, rotation, cx, cy ) {

		const c = Math.cos( rotation );
		const s = Math.sin( rotation );

		this.set(
			sx * c, sx * s, - sx * ( c * cx + s * cy ) + cx + tx,
			- sy * s, sy * c, - sy * ( - s * cx + c * cy ) + cy + ty,
			0, 0, 1
		);

		return this;

	}

	/**
	 * Scales this matrix with the given scalar values.
	 *
	 * @param {number} sx - The amount to scale in the X axis.
	 * @param {number} sy - The amount to scale in the Y axis.
	 * @return {Matrix3} A reference to this matrix.
	 */
	scale( sx, sy ) {

		this.premultiply( _m3.makeScale( sx, sy ) );

		return this;

	}

	/**
	 * Rotates this matrix by the given angle.
	 *
	 * @param {number} theta - The rotation in radians.
	 * @return {Matrix3} A reference to this matrix.
	 */
	rotate( theta ) {

		this.premultiply( _m3.makeRotation( - theta ) );

		return this;

	}

	/**
	 * Translates this matrix by the given scalar values.
	 *
	 * @param {number} tx - The amount to translate in the X axis.
	 * @param {number} ty - The amount to translate in the Y axis.
	 * @return {Matrix3} A reference to this matrix.
	 */
	translate( tx, ty ) {

		this.premultiply( _m3.makeTranslation( tx, ty ) );

		return this;

	}

	// for 2D Transforms

	/**
	 * Sets this matrix as a 2D translation transform.
	 *
	 * @param {number|Vector2} x - The amount to translate in the X axis or alternatively a translation vector.
	 * @param {number} y - The amount to translate in the Y axis.
	 * @return {Matrix3} A reference to this matrix.
	 */
	makeTranslation( x, y ) {

		if ( x.isVector2 ) {

			this.set(

				1, 0, x.x,
				0, 1, x.y,
				0, 0, 1

			);

		} else {

			this.set(

				1, 0, x,
				0, 1, y,
				0, 0, 1

			);

		}

		return this;

	}

	/**
	 * Sets this matrix as a 2D rotational transformation.
	 *
	 * @param {number} theta - The rotation in radians.
	 * @return {Matrix3} A reference to this matrix.
	 */
	makeRotation( theta ) {

		// counterclockwise

		const c = Math.cos( theta );
		const s = Math.sin( theta );

		this.set(

			c, - s, 0,
			s, c, 0,
			0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix as a 2D scale transform.
	 *
	 * @param {number} x - The amount to scale in the X axis.
	 * @param {number} y - The amount to scale in the Y axis.
	 * @return {Matrix3} A reference to this matrix.
	 */
	makeScale( x, y ) {

		this.set(

			x, 0, 0,
			0, y, 0,
			0, 0, 1

		);

		return this;

	}

	/**
	 * Returns `true` if this matrix is equal with the given one.
	 *
	 * @param {Matrix3} matrix - The matrix to test for equality.
	 * @return {boolean} Whether this matrix is equal with the given one.
	 */
	equals( matrix ) {

		const te = this.elements;
		const me = matrix.elements;

		for ( let i = 0; i < 9; i ++ ) {

			if ( te[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

	/**
	 * Sets the elements of the matrix from the given array.
	 *
	 * @param {Array<number>} array - The matrix elements in column-major order.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Matrix3} A reference to this matrix.
	 */
	fromArray( array, offset = 0 ) {

		for ( let i = 0; i < 9; i ++ ) {

			this.elements[ i ] = array[ i + offset ];

		}

		return this;

	}

	/**
	 * Writes the elements of this matrix to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number>} [array=[]] - The target array holding the matrix elements in column-major order.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number>} The matrix elements in column-major order.
	 */
	toArray( array = [], offset = 0 ) {

		const te = this.elements;

		array[ offset ] = te[ 0 ];
		array[ offset + 1 ] = te[ 1 ];
		array[ offset + 2 ] = te[ 2 ];

		array[ offset + 3 ] = te[ 3 ];
		array[ offset + 4 ] = te[ 4 ];
		array[ offset + 5 ] = te[ 5 ];

		array[ offset + 6 ] = te[ 6 ];
		array[ offset + 7 ] = te[ 7 ];
		array[ offset + 8 ] = te[ 8 ];

		return array;

	}

	/**
	 * Returns a matrix with copied values from this instance.
	 *
	 * @return {Matrix3} A clone of this instance.
	 */
	clone() {

		return new this.constructor().fromArray( this.elements );

	}

}

const _m3 = /*@__PURE__*/ new Matrix3();

function arrayNeedsUint32( array ) {

	// assumes larger values usually on last

	for ( let i = array.length - 1; i >= 0; -- i ) {

		if ( array[ i ] >= 65535 ) return true; // account for PRIMITIVE_RESTART_FIXED_INDEX, #24565

	}

	return false;

}

const TYPED_ARRAYS = {
	Int8Array: Int8Array,
	Uint8Array: Uint8Array,
	Uint8ClampedArray: Uint8ClampedArray,
	Int16Array: Int16Array,
	Uint16Array: Uint16Array,
	Int32Array: Int32Array,
	Uint32Array: Uint32Array,
	Float32Array: Float32Array,
	Float64Array: Float64Array
};

function getTypedArray( type, buffer ) {

	return new TYPED_ARRAYS[ type ]( buffer );

}

function createElementNS( name ) {

	return document.createElementNS( 'http://www.w3.org/1999/xhtml', name );

}

function createCanvasElement() {

	const canvas = createElementNS( 'canvas' );
	canvas.style.display = 'block';
	return canvas;

}

const _cache = {};

function warnOnce( message ) {

	if ( message in _cache ) return;

	_cache[ message ] = true;

	console.warn( message );

}

function probeAsync( gl, sync, interval ) {

	return new Promise( function ( resolve, reject ) {

		function probe() {

			switch ( gl.clientWaitSync( sync, gl.SYNC_FLUSH_COMMANDS_BIT, 0 ) ) {

				case gl.WAIT_FAILED:
					reject();
					break;

				case gl.TIMEOUT_EXPIRED:
					setTimeout( probe, interval );
					break;

				default:
					resolve();

			}

		}

		setTimeout( probe, interval );

	} );

}

const LINEAR_REC709_TO_XYZ = /*@__PURE__*/ new Matrix3().set(
	0.4123908, 0.3575843, 0.1804808,
	0.2126390, 0.7151687, 0.0721923,
	0.0193308, 0.1191948, 0.9505322
);

const XYZ_TO_LINEAR_REC709 = /*@__PURE__*/ new Matrix3().set(
	3.2409699, -1.5373832, -0.4986108,
	-0.9692436, 1.8759675, 0.0415551,
	0.0556301, -0.203977, 1.0569715
);

function createColorManagement() {

	const ColorManagement = {

		enabled: true,

		workingColorSpace: LinearSRGBColorSpace,

		/**
		 * Implementations of supported color spaces.
		 *
		 * Required:
		 *	- primaries: chromaticity coordinates [ rx ry gx gy bx by ]
		 *	- whitePoint: reference white [ x y ]
		 *	- transfer: transfer function (pre-defined)
		 *	- toXYZ: Matrix3 RGB to XYZ transform
		 *	- fromXYZ: Matrix3 XYZ to RGB transform
		 *	- luminanceCoefficients: RGB luminance coefficients
		 *
		 * Optional:
		 *  - outputColorSpaceConfig: { drawingBufferColorSpace: ColorSpace, toneMappingMode: 'extended' | 'standard' }
		 *  - workingColorSpaceConfig: { unpackColorSpace: ColorSpace }
		 *
		 * Reference:
		 * - https://www.russellcottrell.com/photo/matrixCalculator.htm
		 */
		spaces: {},

		convert: function ( color, sourceColorSpace, targetColorSpace ) {

			if ( this.enabled === false || sourceColorSpace === targetColorSpace || ! sourceColorSpace || ! targetColorSpace ) {

				return color;

			}

			if ( this.spaces[ sourceColorSpace ].transfer === SRGBTransfer ) {

				color.r = SRGBToLinear( color.r );
				color.g = SRGBToLinear( color.g );
				color.b = SRGBToLinear( color.b );

			}

			if ( this.spaces[ sourceColorSpace ].primaries !== this.spaces[ targetColorSpace ].primaries ) {

				color.applyMatrix3( this.spaces[ sourceColorSpace ].toXYZ );
				color.applyMatrix3( this.spaces[ targetColorSpace ].fromXYZ );

			}

			if ( this.spaces[ targetColorSpace ].transfer === SRGBTransfer ) {

				color.r = LinearToSRGB( color.r );
				color.g = LinearToSRGB( color.g );
				color.b = LinearToSRGB( color.b );

			}

			return color;

		},

		workingToColorSpace: function ( color, targetColorSpace ) {

			return this.convert( color, this.workingColorSpace, targetColorSpace );

		},

		colorSpaceToWorking: function ( color, sourceColorSpace ) {

			return this.convert( color, sourceColorSpace, this.workingColorSpace );

		},

		getPrimaries: function ( colorSpace ) {

			return this.spaces[ colorSpace ].primaries;

		},

		getTransfer: function ( colorSpace ) {

			if ( colorSpace === NoColorSpace ) return LinearTransfer;

			return this.spaces[ colorSpace ].transfer;

		},

		getToneMappingMode: function ( colorSpace ) {

			return this.spaces[ colorSpace ].outputColorSpaceConfig.toneMappingMode || 'standard';

		},

		getLuminanceCoefficients: function ( target, colorSpace = this.workingColorSpace ) {

			return target.fromArray( this.spaces[ colorSpace ].luminanceCoefficients );

		},

		define: function ( colorSpaces ) {

			Object.assign( this.spaces, colorSpaces );

		},

		// Internal APIs

		_getMatrix: function ( targetMatrix, sourceColorSpace, targetColorSpace ) {

			return targetMatrix
				.copy( this.spaces[ sourceColorSpace ].toXYZ )
				.multiply( this.spaces[ targetColorSpace ].fromXYZ );

		},

		_getDrawingBufferColorSpace: function ( colorSpace ) {

			return this.spaces[ colorSpace ].outputColorSpaceConfig.drawingBufferColorSpace;

		},

		_getUnpackColorSpace: function ( colorSpace = this.workingColorSpace ) {

			return this.spaces[ colorSpace ].workingColorSpaceConfig.unpackColorSpace;

		},

		// Deprecated

		fromWorkingColorSpace: function ( color, targetColorSpace ) {

			warnOnce( 'THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().' ); // @deprecated, r177

			return ColorManagement.workingToColorSpace( color, targetColorSpace );

		},

		toWorkingColorSpace: function ( color, sourceColorSpace ) {

			warnOnce( 'THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().' ); // @deprecated, r177

			return ColorManagement.colorSpaceToWorking( color, sourceColorSpace );

		},

	};

	/******************************************************************************
	 * sRGB definitions
	 */

	const REC709_PRIMARIES = [ 0.640, 0.330, 0.300, 0.600, 0.150, 0.060 ];
	const REC709_LUMINANCE_COEFFICIENTS = [ 0.2126, 0.7152, 0.0722 ];
	const D65 = [ 0.3127, 0.3290 ];

	ColorManagement.define( {

		[ LinearSRGBColorSpace ]: {
			primaries: REC709_PRIMARIES,
			whitePoint: D65,
			transfer: LinearTransfer,
			toXYZ: LINEAR_REC709_TO_XYZ,
			fromXYZ: XYZ_TO_LINEAR_REC709,
			luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS,
			workingColorSpaceConfig: { unpackColorSpace: SRGBColorSpace },
			outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }
		},

		[ SRGBColorSpace ]: {
			primaries: REC709_PRIMARIES,
			whitePoint: D65,
			transfer: SRGBTransfer,
			toXYZ: LINEAR_REC709_TO_XYZ,
			fromXYZ: XYZ_TO_LINEAR_REC709,
			luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS,
			outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }
		},

	} );

	return ColorManagement;

}

const ColorManagement = /*@__PURE__*/ createColorManagement();

function SRGBToLinear( c ) {

	return ( c < 0.04045 ) ? c * 0.0773993808 : Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

}

function LinearToSRGB( c ) {

	return ( c < 0.0031308 ) ? c * 12.92 : 1.055 * ( Math.pow( c, 0.41666 ) ) - 0.055;

}

let _canvas;

/**
 * A class containing utility functions for images.
 *
 * @hideconstructor
 */
class ImageUtils {

	/**
	 * Returns a data URI containing a representation of the given image.
	 *
	 * @param {(HTMLImageElement|HTMLCanvasElement)} image - The image object.
	 * @param {string} [type='image/png'] - Indicates the image format.
	 * @return {string} The data URI.
	 */
	static getDataURL( image, type = 'image/png' ) {

		if ( /^data:/i.test( image.src ) ) {

			return image.src;

		}

		if ( typeof HTMLCanvasElement === 'undefined' ) {

			return image.src;

		}

		let canvas;

		if ( image instanceof HTMLCanvasElement ) {

			canvas = image;

		} else {

			if ( _canvas === undefined ) _canvas = createElementNS( 'canvas' );

			_canvas.width = image.width;
			_canvas.height = image.height;

			const context = _canvas.getContext( '2d' );

			if ( image instanceof ImageData ) {

				context.putImageData( image, 0, 0 );

			} else {

				context.drawImage( image, 0, 0, image.width, image.height );

			}

			canvas = _canvas;

		}

		return canvas.toDataURL( type );

	}

	/**
	 * Converts the given sRGB image data to linear color space.
	 *
	 * @param {(HTMLImageElement|HTMLCanvasElement|ImageBitmap|Object)} image - The image object.
	 * @return {HTMLCanvasElement|Object} The converted image.
	 */
	static sRGBToLinear( image ) {

		if ( ( typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement ) ||
			( typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement ) ||
			( typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ) ) {

			const canvas = createElementNS( 'canvas' );

			canvas.width = image.width;
			canvas.height = image.height;

			const context = canvas.getContext( '2d' );
			context.drawImage( image, 0, 0, image.width, image.height );

			const imageData = context.getImageData( 0, 0, image.width, image.height );
			const data = imageData.data;

			for ( let i = 0; i < data.length; i ++ ) {

				data[ i ] = SRGBToLinear( data[ i ] / 255 ) * 255;

			}

			context.putImageData( imageData, 0, 0 );

			return canvas;

		} else if ( image.data ) {

			const data = image.data.slice( 0 );

			for ( let i = 0; i < data.length; i ++ ) {

				if ( data instanceof Uint8Array || data instanceof Uint8ClampedArray ) {

					data[ i ] = Math.floor( SRGBToLinear( data[ i ] / 255 ) * 255 );

				} else {

					// assuming float

					data[ i ] = SRGBToLinear( data[ i ] );

				}

			}

			return {
				data: data,
				width: image.width,
				height: image.height
			};

		} else {

			console.warn( 'THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.' );
			return image;

		}

	}

}

let _sourceId = 0;

/**
 * Represents the data source of a texture.
 *
 * The main purpose of this class is to decouple the data definition from the texture
 * definition so the same data can be used with multiple texture instances.
 */
class Source {

	/**
	 * Constructs a new video texture.
	 *
	 * @param {any} [data=null] - The data definition of a texture.
	 */
	constructor( data = null ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isSource = true;

		/**
		 * The ID of the source.
		 *
		 * @name Source#id
		 * @type {number}
		 * @readonly
		 */
		Object.defineProperty( this, 'id', { value: _sourceId ++ } );

		/**
		 * The UUID of the source.
		 *
		 * @type {string}
		 * @readonly
		 */
		this.uuid = generateUUID();

		/**
		 * The data definition of a texture.
		 *
		 * @type {any}
		 */
		this.data = data;

		/**
		 * This property is only relevant when {@link Source#needsUpdate} is set to `true` and
		 * provides more control on how texture data should be processed. When `dataReady` is set
		 * to `false`, the engine performs the memory allocation (if necessary) but does not transfer
		 * the data into the GPU memory.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.dataReady = true;

		/**
		 * This starts at `0` and counts how many times {@link Source#needsUpdate} is set to `true`.
		 *
		 * @type {number}
		 * @readonly
		 * @default 0
		 */
		this.version = 0;

	}

	/**
	 * Returns the dimensions of the source into the given target vector.
	 *
	 * @param {(Vector2|Vector3)} target - The target object the result is written into.
	 * @return {(Vector2|Vector3)} The dimensions of the source.
	 */
	getSize( target ) {

		const data = this.data;

		if ( ( typeof HTMLVideoElement !== 'undefined' ) && ( data instanceof HTMLVideoElement ) ) {

			target.set( data.videoWidth, data.videoHeight, 0 );

		} else if ( data instanceof VideoFrame ) {

			target.set( data.displayHeight, data.displayWidth, 0 );

		} else if ( data !== null ) {

			target.set( data.width, data.height, data.depth || 0 );

		} else {

			target.set( 0, 0, 0 );

		}

		return target;

	}

	/**
	 * When the property is set to `true`, the engine allocates the memory
	 * for the texture (if necessary) and triggers the actual texture upload
	 * to the GPU next time the source is used.
	 *
	 * @type {boolean}
	 * @default false
	 * @param {boolean} value
	 */
	set needsUpdate( value ) {

		if ( value === true ) this.version ++;

	}

	/**
	 * Serializes the source into JSON.
	 *
	 * @param {?(Object|string)} meta - An optional value holding meta information about the serialization.
	 * @return {Object} A JSON object representing the serialized source.
	 * @see {@link ObjectLoader#parse}
	 */
	toJSON( meta ) {

		const isRootObject = ( meta === undefined || typeof meta === 'string' );

		if ( ! isRootObject && meta.images[ this.uuid ] !== undefined ) {

			return meta.images[ this.uuid ];

		}

		const output = {
			uuid: this.uuid,
			url: ''
		};

		const data = this.data;

		if ( data !== null ) {

			let url;

			if ( Array.isArray( data ) ) {

				// cube texture

				url = [];

				for ( let i = 0, l = data.length; i < l; i ++ ) {

					if ( data[ i ].isDataTexture ) {

						url.push( serializeImage( data[ i ].image ) );

					} else {

						url.push( serializeImage( data[ i ] ) );

					}

				}

			} else {

				// texture

				url = serializeImage( data );

			}

			output.url = url;

		}

		if ( ! isRootObject ) {

			meta.images[ this.uuid ] = output;

		}

		return output;

	}

}

function serializeImage( image ) {

	if ( ( typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement ) ||
		( typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement ) ||
		( typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ) ) {

		// default images

		return ImageUtils.getDataURL( image );

	} else {

		if ( image.data ) {

			// images of DataTexture

			return {
				data: Array.from( image.data ),
				width: image.width,
				height: image.height,
				type: image.data.constructor.name
			};

		} else {

			console.warn( 'THREE.Texture: Unable to serialize Texture.' );
			return {};

		}

	}

}

let _textureId = 0;

const _tempVec3 = /*@__PURE__*/ new Vector3();

/**
 * Base class for all textures.
 *
 * Note: After the initial use of a texture, its dimensions, format, and type
 * cannot be changed. Instead, call {@link Texture#dispose} on the texture and instantiate a new one.
 *
 * @augments EventDispatcher
 */
class Texture extends EventDispatcher {

	/**
	 * Constructs a new texture.
	 *
	 * @param {?Object} [image=Texture.DEFAULT_IMAGE] - The image holding the texture data.
	 * @param {number} [mapping=Texture.DEFAULT_MAPPING] - The texture mapping.
	 * @param {number} [wrapS=ClampToEdgeWrapping] - The wrapS value.
	 * @param {number} [wrapT=ClampToEdgeWrapping] - The wrapT value.
	 * @param {number} [magFilter=LinearFilter] - The mag filter value.
	 * @param {number} [minFilter=LinearMipmapLinearFilter] - The min filter value.
	 * @param {number} [format=RGBAFormat] - The texture format.
	 * @param {number} [type=UnsignedByteType] - The texture type.
	 * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - The anisotropy value.
	 * @param {string} [colorSpace=NoColorSpace] - The color space.
	 */
	constructor( image = Texture.DEFAULT_IMAGE, mapping = Texture.DEFAULT_MAPPING, wrapS = ClampToEdgeWrapping, wrapT = ClampToEdgeWrapping, magFilter = LinearFilter, minFilter = LinearMipmapLinearFilter, format = RGBAFormat, type = UnsignedByteType, anisotropy = Texture.DEFAULT_ANISOTROPY, colorSpace = NoColorSpace ) {

		super();

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isTexture = true;

		/**
		 * The ID of the texture.
		 *
		 * @name Texture#id
		 * @type {number}
		 * @readonly
		 */
		Object.defineProperty( this, 'id', { value: _textureId ++ } );

		/**
		 * The UUID of the material.
		 *
		 * @type {string}
		 * @readonly
		 */
		this.uuid = generateUUID();

		/**
		 * The name of the material.
		 *
		 * @type {string}
		 */
		this.name = '';

		/**
		 * The data definition of a texture. A reference to the data source can be
		 * shared across textures. This is often useful in context of spritesheets
		 * where multiple textures render the same data but with different texture
		 * transformations.
		 *
		 * @type {Source}
		 */
		this.source = new Source( image );

		/**
		 * An array holding user-defined mipmaps.
		 *
		 * @type {Array<Object>}
		 */
		this.mipmaps = [];

		/**
		 * How the texture is applied to the object. The value `UVMapping`
		 * is the default, where texture or uv coordinates are used to apply the map.
		 *
		 * @type {(UVMapping|CubeReflectionMapping|CubeRefractionMapping|EquirectangularReflectionMapping|EquirectangularRefractionMapping|CubeUVReflectionMapping)}
		 * @default UVMapping
		*/
		this.mapping = mapping;

		/**
		 * Lets you select the uv attribute to map the texture to. `0` for `uv`,
		 * `1` for `uv1`, `2` for `uv2` and `3` for `uv3`.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.channel = 0;

		/**
		 * This defines how the texture is wrapped horizontally and corresponds to
		 * *U* in UV mapping.
		 *
		 * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
		 * @default ClampToEdgeWrapping
		 */
		this.wrapS = wrapS;

		/**
		 * This defines how the texture is wrapped horizontally and corresponds to
		 * *V* in UV mapping.
		 *
		 * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
		 * @default ClampToEdgeWrapping
		 */
		this.wrapT = wrapT;

		/**
		 * How the texture is sampled when a texel covers more than one pixel.
		 *
		 * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
		 * @default LinearFilter
		 */
		this.magFilter = magFilter;

		/**
		 * How the texture is sampled when a texel covers less than one pixel.
		 *
		 * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
		 * @default LinearMipmapLinearFilter
		 */
		this.minFilter = minFilter;

		/**
		 * The number of samples taken along the axis through the pixel that has the
		 * highest density of texels. By default, this value is `1`. A higher value
		 * gives a less blurry result than a basic mipmap, at the cost of more
		 * texture samples being used.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.anisotropy = anisotropy;

		/**
		 * The format of the texture.
		 *
		 * @type {number}
		 * @default RGBAFormat
		 */
		this.format = format;

		/**
		 * The default internal format is derived from {@link Texture#format} and {@link Texture#type} and
		 * defines how the texture data is going to be stored on the GPU.
		 *
		 * This property allows to overwrite the default format.
		 *
		 * @type {?string}
		 * @default null
		 */
		this.internalFormat = null;

		/**
		 * The data type of the texture.
		 *
		 * @type {number}
		 * @default UnsignedByteType
		 */
		this.type = type;

		/**
		 * How much a single repetition of the texture is offset from the beginning,
		 * in each direction U and V. Typical range is `0.0` to `1.0`.
		 *
		 * @type {Vector2}
		 * @default (0,0)
		 */
		this.offset = new Vector2( 0, 0 );

		/**
		 * How many times the texture is repeated across the surface, in each
		 * direction U and V. If repeat is set greater than `1` in either direction,
		 * the corresponding wrap parameter should also be set to `RepeatWrapping`
		 * or `MirroredRepeatWrapping` to achieve the desired tiling effect.
		 *
		 * @type {Vector2}
		 * @default (1,1)
		 */
		this.repeat = new Vector2( 1, 1 );

		/**
		 * The point around which rotation occurs. A value of `(0.5, 0.5)` corresponds
		 * to the center of the texture. Default is `(0, 0)`, the lower left.
		 *
		 * @type {Vector2}
		 * @default (0,0)
		 */
		this.center = new Vector2( 0, 0 );

		/**
		 * How much the texture is rotated around the center point, in radians.
		 * Positive values are counter-clockwise.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.rotation = 0;

		/**
		 * Whether to update the texture's uv-transformation {@link Texture#matrix}
		 * from the properties {@link Texture#offset}, {@link Texture#repeat},
		 * {@link Texture#rotation}, and {@link Texture#center}.
		 *
		 * Set this to `false` if you are specifying the uv-transform matrix directly.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.matrixAutoUpdate = true;

		/**
		 * The uv-transformation matrix of the texture.
		 *
		 * @type {Matrix3}
		 */
		this.matrix = new Matrix3();

		/**
		 * Whether to generate mipmaps (if possible) for a texture.
		 *
		 * Set this to `false` if you are creating mipmaps manually.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.generateMipmaps = true;

		/**
		 * If set to `true`, the alpha channel, if present, is multiplied into the
		 * color channels when the texture is uploaded to the GPU.
		 *
		 * Note that this property has no effect when using `ImageBitmap`. You need to
		 * configure premultiply alpha on bitmap creation instead.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.premultiplyAlpha = false;

		/**
		 * If set to `true`, the texture is flipped along the vertical axis when
		 * uploaded to the GPU.
		 *
		 * Note that this property has no effect when using `ImageBitmap`. You need to
		 * configure the flip on bitmap creation instead.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.flipY = true;

		/**
		 * Specifies the alignment requirements for the start of each pixel row in memory.
		 * The allowable values are `1` (byte-alignment), `2` (rows aligned to even-numbered bytes),
		 * `4` (word-alignment), and `8` (rows start on double-word boundaries).
		 *
		 * @type {number}
		 * @default 4
		 */
		this.unpackAlignment = 4;	// valid values: 1, 2, 4, 8 (see http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml)

		/**
		 * Textures containing color data should be annotated with `SRGBColorSpace` or `LinearSRGBColorSpace`.
		 *
		 * @type {string}
		 * @default NoColorSpace
		 */
		this.colorSpace = colorSpace;

		/**
		 * An object that can be used to store custom data about the texture. It
		 * should not hold references to functions as these will not be cloned.
		 *
		 * @type {Object}
		 */
		this.userData = {};

		/**
		 * This can be used to only update a subregion or specific rows of the texture (for example, just the
		 * first 3 rows). Use the `addUpdateRange()` function to add ranges to this array.
		 *
		 * @type {Array<Object>}
		 */
		this.updateRanges = [];

		/**
		 * This starts at `0` and counts how many times {@link Texture#needsUpdate} is set to `true`.
		 *
		 * @type {number}
		 * @readonly
		 * @default 0
		 */
		this.version = 0;

		/**
		 * A callback function, called when the texture is updated (e.g., when
		 * {@link Texture#needsUpdate} has been set to true and then the texture is used).
		 *
		 * @type {?Function}
		 * @default null
		 */
		this.onUpdate = null;

		/**
		 * An optional back reference to the textures render target.
		 *
		 * @type {?(RenderTarget|WebGLRenderTarget)}
		 * @default null
		 */
		this.renderTarget = null;

		/**
		 * Indicates whether a texture belongs to a render target or not.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default false
		 */
		this.isRenderTargetTexture = false;

		/**
		 * Indicates if a texture should be handled like a texture array.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default false
		 */
		this.isArrayTexture = image && image.depth && image.depth > 1 ? true : false;

		/**
		 * Indicates whether this texture should be processed by `PMREMGenerator` or not
		 * (only relevant for render target textures).
		 *
		 * @type {number}
		 * @readonly
		 * @default 0
		 */
		this.pmremVersion = 0;

	}

	/**
	 * The width of the texture in pixels.
	 */
	get width() {

		return this.source.getSize( _tempVec3 ).x;

	}

	/**
	 * The height of the texture in pixels.
	 */
	get height() {

		return this.source.getSize( _tempVec3 ).y;

	}

	/**
	 * The depth of the texture in pixels.
	 */
	get depth() {

		return this.source.getSize( _tempVec3 ).z;

	}

	/**
	 * The image object holding the texture data.
	 *
	 * @type {?Object}
	 */
	get image() {

		return this.source.data;

	}

	set image( value = null ) {

		this.source.data = value;

	}

	/**
	 * Updates the texture transformation matrix from the from the properties {@link Texture#offset},
	 * {@link Texture#repeat}, {@link Texture#rotation}, and {@link Texture#center}.
	 */
	updateMatrix() {

		this.matrix.setUvTransform( this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y );

	}

	/**
	 * Adds a range of data in the data texture to be updated on the GPU.
	 *
	 * @param {number} start - Position at which to start update.
	 * @param {number} count - The number of components to update.
	 */
	addUpdateRange( start, count ) {

		this.updateRanges.push( { start, count } );

	}

	/**
	 * Clears the update ranges.
	 */
	clearUpdateRanges() {

		this.updateRanges.length = 0;

	}

	/**
	 * Returns a new texture with copied values from this instance.
	 *
	 * @return {Texture} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	 * Copies the values of the given texture to this instance.
	 *
	 * @param {Texture} source - The texture to copy.
	 * @return {Texture} A reference to this instance.
	 */
	copy( source ) {

		this.name = source.name;

		this.source = source.source;
		this.mipmaps = source.mipmaps.slice( 0 );

		this.mapping = source.mapping;
		this.channel = source.channel;

		this.wrapS = source.wrapS;
		this.wrapT = source.wrapT;

		this.magFilter = source.magFilter;
		this.minFilter = source.minFilter;

		this.anisotropy = source.anisotropy;

		this.format = source.format;
		this.internalFormat = source.internalFormat;
		this.type = source.type;

		this.offset.copy( source.offset );
		this.repeat.copy( source.repeat );
		this.center.copy( source.center );
		this.rotation = source.rotation;

		this.matrixAutoUpdate = source.matrixAutoUpdate;
		this.matrix.copy( source.matrix );

		this.generateMipmaps = source.generateMipmaps;
		this.premultiplyAlpha = source.premultiplyAlpha;
		this.flipY = source.flipY;
		this.unpackAlignment = source.unpackAlignment;
		this.colorSpace = source.colorSpace;

		this.renderTarget = source.renderTarget;
		this.isRenderTargetTexture = source.isRenderTargetTexture;
		this.isArrayTexture = source.isArrayTexture;

		this.userData = JSON.parse( JSON.stringify( source.userData ) );

		this.needsUpdate = true;

		return this;

	}

	/**
	 * Sets this texture's properties based on `values`.
	 * @param {Object} values - A container with texture parameters.
	 */
	setValues( values ) {

		for ( const key in values ) {

			const newValue = values[ key ];

			if ( newValue === undefined ) {

				console.warn( `THREE.Texture.setValues(): parameter '${ key }' has value of undefined.` );
				continue;

			}

			const currentValue = this[ key ];

			if ( currentValue === undefined ) {

				console.warn( `THREE.Texture.setValues(): property '${ key }' does not exist.` );
				continue;

			}

			if ( ( currentValue && newValue ) && ( currentValue.isVector2 && newValue.isVector2 ) ) {

				currentValue.copy( newValue );

			} else if ( ( currentValue && newValue ) && ( currentValue.isVector3 && newValue.isVector3 ) ) {

				currentValue.copy( newValue );

			} else if ( ( currentValue && newValue ) && ( currentValue.isMatrix3 && newValue.isMatrix3 ) ) {

				currentValue.copy( newValue );

			} else {

				this[ key ] = newValue;

			}

		}

	}

	/**
	 * Serializes the texture into JSON.
	 *
	 * @param {?(Object|string)} meta - An optional value holding meta information about the serialization.
	 * @return {Object} A JSON object representing the serialized texture.
	 * @see {@link ObjectLoader#parse}
	 */
	toJSON( meta ) {

		const isRootObject = ( meta === undefined || typeof meta === 'string' );

		if ( ! isRootObject && meta.textures[ this.uuid ] !== undefined ) {

			return meta.textures[ this.uuid ];

		}

		const output = {

			metadata: {
				version: 4.7,
				type: 'Texture',
				generator: 'Texture.toJSON'
			},

			uuid: this.uuid,
			name: this.name,

			image: this.source.toJSON( meta ).uuid,

			mapping: this.mapping,
			channel: this.channel,

			repeat: [ this.repeat.x, this.repeat.y ],
			offset: [ this.offset.x, this.offset.y ],
			center: [ this.center.x, this.center.y ],
			rotation: this.rotation,

			wrap: [ this.wrapS, this.wrapT ],

			format: this.format,
			internalFormat: this.internalFormat,
			type: this.type,
			colorSpace: this.colorSpace,

			minFilter: this.minFilter,
			magFilter: this.magFilter,
			anisotropy: this.anisotropy,

			flipY: this.flipY,

			generateMipmaps: this.generateMipmaps,
			premultiplyAlpha: this.premultiplyAlpha,
			unpackAlignment: this.unpackAlignment

		};

		if ( Object.keys( this.userData ).length > 0 ) output.userData = this.userData;

		if ( ! isRootObject ) {

			meta.textures[ this.uuid ] = output;

		}

		return output;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 *
	 * @fires Texture#dispose
	 */
	dispose() {

		/**
		 * Fires when the texture has been disposed of.
		 *
		 * @event Texture#dispose
		 * @type {Object}
		 */
		this.dispatchEvent( { type: 'dispose' } );

	}

	/**
	 * Transforms the given uv vector with the textures uv transformation matrix.
	 *
	 * @param {Vector2} uv - The uv vector.
	 * @return {Vector2} The transformed uv vector.
	 */
	transformUv( uv ) {

		if ( this.mapping !== UVMapping ) return uv;

		uv.applyMatrix3( this.matrix );

		if ( uv.x < 0 || uv.x > 1 ) {

			switch ( this.wrapS ) {

				case RepeatWrapping:

					uv.x = uv.x - Math.floor( uv.x );
					break;

				case ClampToEdgeWrapping:

					uv.x = uv.x < 0 ? 0 : 1;
					break;

				case MirroredRepeatWrapping:

					if ( Math.abs( Math.floor( uv.x ) % 2 ) === 1 ) {

						uv.x = Math.ceil( uv.x ) - uv.x;

					} else {

						uv.x = uv.x - Math.floor( uv.x );

					}

					break;

			}

		}

		if ( uv.y < 0 || uv.y > 1 ) {

			switch ( this.wrapT ) {

				case RepeatWrapping:

					uv.y = uv.y - Math.floor( uv.y );
					break;

				case ClampToEdgeWrapping:

					uv.y = uv.y < 0 ? 0 : 1;
					break;

				case MirroredRepeatWrapping:

					if ( Math.abs( Math.floor( uv.y ) % 2 ) === 1 ) {

						uv.y = Math.ceil( uv.y ) - uv.y;

					} else {

						uv.y = uv.y - Math.floor( uv.y );

					}

					break;

			}

		}

		if ( this.flipY ) {

			uv.y = 1 - uv.y;

		}

		return uv;

	}

	/**
	 * Setting this property to `true` indicates the engine the texture
	 * must be updated in the next render. This triggers a texture upload
	 * to the GPU and ensures correct texture parameter configuration.
	 *
	 * @type {boolean}
	 * @default false
	 * @param {boolean} value
	 */
	set needsUpdate( value ) {

		if ( value === true ) {

			this.version ++;
			this.source.needsUpdate = true;

		}

	}

	/**
	 * Setting this property to `true` indicates the engine the PMREM
	 * must be regenerated.
	 *
	 * @type {boolean}
	 * @default false
	 * @param {boolean} value
	 */
	set needsPMREMUpdate( value ) {

		if ( value === true ) {

			this.pmremVersion ++;

		}

	}

}

/**
 * The default image for all textures.
 *
 * @static
 * @type {?Image}
 * @default null
 */
Texture.DEFAULT_IMAGE = null;

/**
 * The default mapping for all textures.
 *
 * @static
 * @type {number}
 * @default UVMapping
 */
Texture.DEFAULT_MAPPING = UVMapping;

/**
 * The default anisotropy value for all textures.
 *
 * @static
 * @type {number}
 * @default 1
 */
Texture.DEFAULT_ANISOTROPY = 1;

/**
 * Class representing a 4D vector. A 4D vector is an ordered quadruplet of numbers
 * (labeled x, y, z and w), which can be used to represent a number of things, such as:
 *
 * - A point in 4D space.
 * - A direction and length in 4D space. In three.js the length will
 * always be the Euclidean distance(straight-line distance) from `(0, 0, 0, 0)` to `(x, y, z, w)`
 * and the direction is also measured from `(0, 0, 0, 0)` towards `(x, y, z, w)`.
 * - Any arbitrary ordered quadruplet of numbers.
 *
 * There are other things a 4D vector can be used to represent, however these
 * are the most common uses in *three.js*.
 *
 * Iterating through a vector instance will yield its components `(x, y, z, w)` in
 * the corresponding order.
 * ```js
 * const a = new THREE.Vector4( 0, 1, 0, 0 );
 *
 * //no arguments; will be initialised to (0, 0, 0, 1)
 * const b = new THREE.Vector4( );
 *
 * const d = a.dot( b );
 * ```
 */
class Vector4 {

	/**
	 * Constructs a new 4D vector.
	 *
	 * @param {number} [x=0] - The x value of this vector.
	 * @param {number} [y=0] - The y value of this vector.
	 * @param {number} [z=0] - The z value of this vector.
	 * @param {number} [w=1] - The w value of this vector.
	 */
	constructor( x = 0, y = 0, z = 0, w = 1 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		Vector4.prototype.isVector4 = true;

		/**
		 * The x value of this vector.
		 *
		 * @type {number}
		 */
		this.x = x;

		/**
		 * The y value of this vector.
		 *
		 * @type {number}
		 */
		this.y = y;

		/**
		 * The z value of this vector.
		 *
		 * @type {number}
		 */
		this.z = z;

		/**
		 * The w value of this vector.
		 *
		 * @type {number}
		 */
		this.w = w;

	}

	/**
	 * Alias for {@link Vector4#z}.
	 *
	 * @type {number}
	 */
	get width() {

		return this.z;

	}

	set width( value ) {

		this.z = value;

	}

	/**
	 * Alias for {@link Vector4#w}.
	 *
	 * @type {number}
	 */
	get height() {

		return this.w;

	}

	set height( value ) {

		this.w = value;

	}

	/**
	 * Sets the vector components.
	 *
	 * @param {number} x - The value of the x component.
	 * @param {number} y - The value of the y component.
	 * @param {number} z - The value of the z component.
	 * @param {number} w - The value of the w component.
	 * @return {Vector4} A reference to this vector.
	 */
	set( x, y, z, w ) {

		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

		return this;

	}

	/**
	 * Sets the vector components to the same value.
	 *
	 * @param {number} scalar - The value to set for all vector components.
	 * @return {Vector4} A reference to this vector.
	 */
	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;
		this.z = scalar;
		this.w = scalar;

		return this;

	}

	/**
	 * Sets the vector's x component to the given value
	 *
	 * @param {number} x - The value to set.
	 * @return {Vector4} A reference to this vector.
	 */
	setX( x ) {

		this.x = x;

		return this;

	}

	/**
	 * Sets the vector's y component to the given value
	 *
	 * @param {number} y - The value to set.
	 * @return {Vector4} A reference to this vector.
	 */
	setY( y ) {

		this.y = y;

		return this;

	}

	/**
	 * Sets the vector's z component to the given value
	 *
	 * @param {number} z - The value to set.
	 * @return {Vector4} A reference to this vector.
	 */
	setZ( z ) {

		this.z = z;

		return this;

	}

	/**
	 * Sets the vector's w component to the given value
	 *
	 * @param {number} w - The value to set.
	 * @return {Vector4} A reference to this vector.
	 */
	setW( w ) {

		this.w = w;

		return this;

	}

	/**
	 * Allows to set a vector component with an index.
	 *
	 * @param {number} index - The component index. `0` equals to x, `1` equals to y,
	 * `2` equals to z, `3` equals to w.
	 * @param {number} value - The value to set.
	 * @return {Vector4} A reference to this vector.
	 */
	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			case 2: this.z = value; break;
			case 3: this.w = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

	/**
	 * Returns the value of the vector component which matches the given index.
	 *
	 * @param {number} index - The component index. `0` equals to x, `1` equals to y,
	 * `2` equals to z, `3` equals to w.
	 * @return {number} A vector component value.
	 */
	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			case 3: return this.w;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

	/**
	 * Returns a new vector with copied values from this instance.
	 *
	 * @return {Vector4} A clone of this instance.
	 */
	clone() {

		return new this.constructor( this.x, this.y, this.z, this.w );

	}

	/**
	 * Copies the values of the given vector to this instance.
	 *
	 * @param {Vector3|Vector4} v - The vector to copy.
	 * @return {Vector4} A reference to this vector.
	 */
	copy( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
		this.w = ( v.w !== undefined ) ? v.w : 1;

		return this;

	}

	/**
	 * Adds the given vector to this instance.
	 *
	 * @param {Vector4} v - The vector to add.
	 * @return {Vector4} A reference to this vector.
	 */
	add( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		this.w += v.w;

		return this;

	}

	/**
	 * Adds the given scalar value to all components of this instance.
	 *
	 * @param {number} s - The scalar to add.
	 * @return {Vector4} A reference to this vector.
	 */
	addScalar( s ) {

		this.x += s;
		this.y += s;
		this.z += s;
		this.w += s;

		return this;

	}

	/**
	 * Adds the given vectors and stores the result in this instance.
	 *
	 * @param {Vector4} a - The first vector.
	 * @param {Vector4} b - The second vector.
	 * @return {Vector4} A reference to this vector.
	 */
	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;
		this.w = a.w + b.w;

		return this;

	}

	/**
	 * Adds the given vector scaled by the given factor to this instance.
	 *
	 * @param {Vector4} v - The vector.
	 * @param {number} s - The factor that scales `v`.
	 * @return {Vector4} A reference to this vector.
	 */
	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;
		this.z += v.z * s;
		this.w += v.w * s;

		return this;

	}

	/**
	 * Subtracts the given vector from this instance.
	 *
	 * @param {Vector4} v - The vector to subtract.
	 * @return {Vector4} A reference to this vector.
	 */
	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		this.w -= v.w;

		return this;

	}

	/**
	 * Subtracts the given scalar value from all components of this instance.
	 *
	 * @param {number} s - The scalar to subtract.
	 * @return {Vector4} A reference to this vector.
	 */
	subScalar( s ) {

		this.x -= s;
		this.y -= s;
		this.z -= s;
		this.w -= s;

		return this;

	}

	/**
	 * Subtracts the given vectors and stores the result in this instance.
	 *
	 * @param {Vector4} a - The first vector.
	 * @param {Vector4} b - The second vector.
	 * @return {Vector4} A reference to this vector.
	 */
	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;
		this.w = a.w - b.w;

		return this;

	}

	/**
	 * Multiplies the given vector with this instance.
	 *
	 * @param {Vector4} v - The vector to multiply.
	 * @return {Vector4} A reference to this vector.
	 */
	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;
		this.w *= v.w;

		return this;

	}

	/**
	 * Multiplies the given scalar value with all components of this instance.
	 *
	 * @param {number} scalar - The scalar to multiply.
	 * @return {Vector4} A reference to this vector.
	 */
	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		this.w *= scalar;

		return this;

	}

	/**
	 * Multiplies this vector with the given 4x4 matrix.
	 *
	 * @param {Matrix4} m - The 4x4 matrix.
	 * @return {Vector4} A reference to this vector.
	 */
	applyMatrix4( m ) {

		const x = this.x, y = this.y, z = this.z, w = this.w;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] * w;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] * w;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] * w;
		this.w = e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] * w;

		return this;

	}

	/**
	 * Divides this instance by the given vector.
	 *
	 * @param {Vector4} v - The vector to divide.
	 * @return {Vector4} A reference to this vector.
	 */
	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;
		this.w /= v.w;

		return this;

	}

	/**
	 * Divides this vector by the given scalar.
	 *
	 * @param {number} scalar - The scalar to divide.
	 * @return {Vector4} A reference to this vector.
	 */
	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

	/**
	 * Sets the x, y and z components of this
	 * vector to the quaternion's axis and w to the angle.
	 *
	 * @param {Quaternion} q - The Quaternion to set.
	 * @return {Vector4} A reference to this vector.
	 */
	setAxisAngleFromQuaternion( q ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm

		// q is assumed to be normalized

		this.w = 2 * Math.acos( q.w );

		const s = Math.sqrt( 1 - q.w * q.w );

		if ( s < 0.0001 ) {

			this.x = 1;
			this.y = 0;
			this.z = 0;

		} else {

			this.x = q.x / s;
			this.y = q.y / s;
			this.z = q.z / s;

		}

		return this;

	}

	/**
	 * Sets the x, y and z components of this
	 * vector to the axis of rotation and w to the angle.
	 *
	 * @param {Matrix4} m - A 4x4 matrix of which the upper left 3x3 matrix is a pure rotation matrix.
	 * @return {Vector4} A reference to this vector.
	 */
	setAxisAngleFromRotationMatrix( m ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToAngle/index.htm

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		let angle, x, y, z; // variables for result
		const epsilon = 0.01,		// margin to allow for rounding errors
			epsilon2 = 0.1,		// margin to distinguish between 0 and 180 degrees

			te = m.elements,

			m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
			m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
			m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ];

		if ( ( Math.abs( m12 - m21 ) < epsilon ) &&
		     ( Math.abs( m13 - m31 ) < epsilon ) &&
		     ( Math.abs( m23 - m32 ) < epsilon ) ) {

			// singularity found
			// first check for identity matrix which must have +1 for all terms
			// in leading diagonal and zero in other terms

			if ( ( Math.abs( m12 + m21 ) < epsilon2 ) &&
			     ( Math.abs( m13 + m31 ) < epsilon2 ) &&
			     ( Math.abs( m23 + m32 ) < epsilon2 ) &&
			     ( Math.abs( m11 + m22 + m33 - 3 ) < epsilon2 ) ) {

				// this singularity is identity matrix so angle = 0

				this.set( 1, 0, 0, 0 );

				return this; // zero angle, arbitrary axis

			}

			// otherwise this singularity is angle = 180

			angle = Math.PI;

			const xx = ( m11 + 1 ) / 2;
			const yy = ( m22 + 1 ) / 2;
			const zz = ( m33 + 1 ) / 2;
			const xy = ( m12 + m21 ) / 4;
			const xz = ( m13 + m31 ) / 4;
			const yz = ( m23 + m32 ) / 4;

			if ( ( xx > yy ) && ( xx > zz ) ) {

				// m11 is the largest diagonal term

				if ( xx < epsilon ) {

					x = 0;
					y = 0.707106781;
					z = 0.707106781;

				} else {

					x = Math.sqrt( xx );
					y = xy / x;
					z = xz / x;

				}

			} else if ( yy > zz ) {

				// m22 is the largest diagonal term

				if ( yy < epsilon ) {

					x = 0.707106781;
					y = 0;
					z = 0.707106781;

				} else {

					y = Math.sqrt( yy );
					x = xy / y;
					z = yz / y;

				}

			} else {

				// m33 is the largest diagonal term so base result on this

				if ( zz < epsilon ) {

					x = 0.707106781;
					y = 0.707106781;
					z = 0;

				} else {

					z = Math.sqrt( zz );
					x = xz / z;
					y = yz / z;

				}

			}

			this.set( x, y, z, angle );

			return this; // return 180 deg rotation

		}

		// as we have reached here there are no singularities so we can handle normally

		let s = Math.sqrt( ( m32 - m23 ) * ( m32 - m23 ) +
			( m13 - m31 ) * ( m13 - m31 ) +
			( m21 - m12 ) * ( m21 - m12 ) ); // used to normalize

		if ( Math.abs( s ) < 0.001 ) s = 1;

		// prevent divide by zero, should not happen if matrix is orthogonal and should be
		// caught by singularity test above, but I've left it in just in case

		this.x = ( m32 - m23 ) / s;
		this.y = ( m13 - m31 ) / s;
		this.z = ( m21 - m12 ) / s;
		this.w = Math.acos( ( m11 + m22 + m33 - 1 ) / 2 );

		return this;

	}

	/**
	 * Sets the vector components to the position elements of the
	 * given transformation matrix.
	 *
	 * @param {Matrix4} m - The 4x4 matrix.
	 * @return {Vector4} A reference to this vector.
	 */
	setFromMatrixPosition( m ) {

		const e = m.elements;

		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];
		this.w = e[ 15 ];

		return this;

	}

	/**
	 * If this vector's x, y, z or w value is greater than the given vector's x, y, z or w
	 * value, replace that value with the corresponding min value.
	 *
	 * @param {Vector4} v - The vector.
	 * @return {Vector4} A reference to this vector.
	 */
	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );
		this.w = Math.min( this.w, v.w );

		return this;

	}

	/**
	 * If this vector's x, y, z or w value is less than the given vector's x, y, z or w
	 * value, replace that value with the corresponding max value.
	 *
	 * @param {Vector4} v - The vector.
	 * @return {Vector4} A reference to this vector.
	 */
	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );
		this.w = Math.max( this.w, v.w );

		return this;

	}

	/**
	 * If this vector's x, y, z or w value is greater than the max vector's x, y, z or w
	 * value, it is replaced by the corresponding value.
	 * If this vector's x, y, z or w value is less than the min vector's x, y, z or w value,
	 * it is replaced by the corresponding value.
	 *
	 * @param {Vector4} min - The minimum x, y and z values.
	 * @param {Vector4} max - The maximum x, y and z values in the desired range.
	 * @return {Vector4} A reference to this vector.
	 */
	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = clamp( this.x, min.x, max.x );
		this.y = clamp( this.y, min.y, max.y );
		this.z = clamp( this.z, min.z, max.z );
		this.w = clamp( this.w, min.w, max.w );

		return this;

	}

	/**
	 * If this vector's x, y, z or w values are greater than the max value, they are
	 * replaced by the max value.
	 * If this vector's x, y, z or w values are less than the min value, they are
	 * replaced by the min value.
	 *
	 * @param {number} minVal - The minimum value the components will be clamped to.
	 * @param {number} maxVal - The maximum value the components will be clamped to.
	 * @return {Vector4} A reference to this vector.
	 */
	clampScalar( minVal, maxVal ) {

		this.x = clamp( this.x, minVal, maxVal );
		this.y = clamp( this.y, minVal, maxVal );
		this.z = clamp( this.z, minVal, maxVal );
		this.w = clamp( this.w, minVal, maxVal );

		return this;

	}

	/**
	 * If this vector's length is greater than the max value, it is replaced by
	 * the max value.
	 * If this vector's length is less than the min value, it is replaced by the
	 * min value.
	 *
	 * @param {number} min - The minimum value the vector length will be clamped to.
	 * @param {number} max - The maximum value the vector length will be clamped to.
	 * @return {Vector4} A reference to this vector.
	 */
	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( clamp( length, min, max ) );

	}

	/**
	 * The components of this vector are rounded down to the nearest integer value.
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );
		this.z = Math.floor( this.z );
		this.w = Math.floor( this.w );

		return this;

	}

	/**
	 * The components of this vector are rounded up to the nearest integer value.
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );
		this.z = Math.ceil( this.z );
		this.w = Math.ceil( this.w );

		return this;

	}

	/**
	 * The components of this vector are rounded to the nearest integer value
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );
		this.z = Math.round( this.z );
		this.w = Math.round( this.w );

		return this;

	}

	/**
	 * The components of this vector are rounded towards zero (up if negative,
	 * down if positive) to an integer value.
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	roundToZero() {

		this.x = Math.trunc( this.x );
		this.y = Math.trunc( this.y );
		this.z = Math.trunc( this.z );
		this.w = Math.trunc( this.w );

		return this;

	}

	/**
	 * Inverts this vector - i.e. sets x = -x, y = -y, z = -z, w = -w.
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	negate() {

		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;
		this.w = - this.w;

		return this;

	}

	/**
	 * Calculates the dot product of the given vector with this instance.
	 *
	 * @param {Vector4} v - The vector to compute the dot product with.
	 * @return {number} The result of the dot product.
	 */
	dot( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;

	}

	/**
	 * Computes the square of the Euclidean length (straight-line length) from
	 * (0, 0, 0, 0) to (x, y, z, w). If you are comparing the lengths of vectors, you should
	 * compare the length squared instead as it is slightly more efficient to calculate.
	 *
	 * @return {number} The square length of this vector.
	 */
	lengthSq() {

		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;

	}

	/**
	 * Computes the  Euclidean length (straight-line length) from (0, 0, 0, 0) to (x, y, z, w).
	 *
	 * @return {number} The length of this vector.
	 */
	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w );

	}

	/**
	 * Computes the Manhattan length of this vector.
	 *
	 * @return {number} The length of this vector.
	 */
	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z ) + Math.abs( this.w );

	}

	/**
	 * Converts this vector to a unit vector - that is, sets it equal to a vector
	 * with the same direction as this one, but with a vector length of `1`.
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	/**
	 * Sets this vector to a vector with the same direction as this one, but
	 * with the specified length.
	 *
	 * @param {number} length - The new length of this vector.
	 * @return {Vector4} A reference to this vector.
	 */
	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

	/**
	 * Linearly interpolates between the given vector and this instance, where
	 * alpha is the percent distance along the line - alpha = 0 will be this
	 * vector, and alpha = 1 will be the given one.
	 *
	 * @param {Vector4} v - The vector to interpolate towards.
	 * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
	 * @return {Vector4} A reference to this vector.
	 */
	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;
		this.z += ( v.z - this.z ) * alpha;
		this.w += ( v.w - this.w ) * alpha;

		return this;

	}

	/**
	 * Linearly interpolates between the given vectors, where alpha is the percent
	 * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
	 * be the second one. The result is stored in this instance.
	 *
	 * @param {Vector4} v1 - The first vector.
	 * @param {Vector4} v2 - The second vector.
	 * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
	 * @return {Vector4} A reference to this vector.
	 */
	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;
		this.z = v1.z + ( v2.z - v1.z ) * alpha;
		this.w = v1.w + ( v2.w - v1.w ) * alpha;

		return this;

	}

	/**
	 * Returns `true` if this vector is equal with the given one.
	 *
	 * @param {Vector4} v - The vector to test for equality.
	 * @return {boolean} Whether this vector is equal with the given one.
	 */
	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) && ( v.w === this.w ) );

	}

	/**
	 * Sets this vector's x value to be `array[ offset ]`, y value to be `array[ offset + 1 ]`,
	 * z value to be `array[ offset + 2 ]`, w value to be `array[ offset + 3 ]`.
	 *
	 * @param {Array<number>} array - An array holding the vector component values.
	 * @param {number} [offset=0] - The offset into the array.
	 * @return {Vector4} A reference to this vector.
	 */
	fromArray( array, offset = 0 ) {

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];
		this.w = array[ offset + 3 ];

		return this;

	}

	/**
	 * Writes the components of this vector to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number>} [array=[]] - The target array holding the vector components.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number>} The vector components.
	 */
	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;
		array[ offset + 3 ] = this.w;

		return array;

	}

	/**
	 * Sets the components of this vector from the given buffer attribute.
	 *
	 * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
	 * @param {number} index - The index into the attribute.
	 * @return {Vector4} A reference to this vector.
	 */
	fromBufferAttribute( attribute, index ) {

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );
		this.z = attribute.getZ( index );
		this.w = attribute.getW( index );

		return this;

	}

	/**
	 * Sets each component of this vector to a pseudo-random value between `0` and
	 * `1`, excluding `1`.
	 *
	 * @return {Vector4} A reference to this vector.
	 */
	random() {

		this.x = Math.random();
		this.y = Math.random();
		this.z = Math.random();
		this.w = Math.random();

		return this;

	}

	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;
		yield this.z;
		yield this.w;

	}

}

/**
 * A render target is a buffer where the video card draws pixels for a scene
 * that is being rendered in the background. It is used in different effects,
 * such as applying postprocessing to a rendered image before displaying it
 * on the screen.
 *
 * @augments EventDispatcher
 */
class RenderTarget extends EventDispatcher {

	/**
	 * Render target options.
	 *
	 * @typedef {Object} RenderTarget~Options
	 * @property {boolean} [generateMipmaps=false] - Whether to generate mipmaps or not.
	 * @property {number} [magFilter=LinearFilter] - The mag filter.
	 * @property {number} [minFilter=LinearFilter] - The min filter.
	 * @property {number} [format=RGBAFormat] - The texture format.
	 * @property {number} [type=UnsignedByteType] - The texture type.
	 * @property {?string} [internalFormat=null] - The texture's internal format.
	 * @property {number} [wrapS=ClampToEdgeWrapping] - The texture's uv wrapping mode.
	 * @property {number} [wrapT=ClampToEdgeWrapping] - The texture's uv wrapping mode.
	 * @property {number} [anisotropy=1] - The texture's anisotropy value.
	 * @property {string} [colorSpace=NoColorSpace] - The texture's color space.
	 * @property {boolean} [depthBuffer=true] - Whether to allocate a depth buffer or not.
	 * @property {boolean} [stencilBuffer=false] - Whether to allocate a stencil buffer or not.
	 * @property {boolean} [resolveDepthBuffer=true] - Whether to resolve the depth buffer or not.
	 * @property {boolean} [resolveStencilBuffer=true] - Whether  to resolve the stencil buffer or not.
	 * @property {?Texture} [depthTexture=null] - Reference to a depth texture.
	 * @property {number} [samples=0] - The MSAA samples count.
	 * @property {number} [count=1] - Defines the number of color attachments . Must be at least `1`.
	 * @property {number} [depth=1] - The texture depth.
	 * @property {boolean} [multiview=false] - Whether this target is used for multiview rendering.
	 */

	/**
	 * Constructs a new render target.
	 *
	 * @param {number} [width=1] - The width of the render target.
	 * @param {number} [height=1] - The height of the render target.
	 * @param {RenderTarget~Options} [options] - The configuration object.
	 */
	constructor( width = 1, height = 1, options = {} ) {

		super();

		options = Object.assign( {
			generateMipmaps: false,
			internalFormat: null,
			minFilter: LinearFilter,
			depthBuffer: true,
			stencilBuffer: false,
			resolveDepthBuffer: true,
			resolveStencilBuffer: true,
			depthTexture: null,
			samples: 0,
			count: 1,
			depth: 1,
			multiview: false
		}, options );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isRenderTarget = true;

		/**
		 * The width of the render target.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.width = width;

		/**
		 * The height of the render target.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.height = height;

		/**
		 * The depth of the render target.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.depth = options.depth;

		/**
		 * A rectangular area inside the render target's viewport. Fragments that are
		 * outside the area will be discarded.
		 *
		 * @type {Vector4}
		 * @default (0,0,width,height)
		 */
		this.scissor = new Vector4( 0, 0, width, height );

		/**
		 * Indicates whether the scissor test should be enabled when rendering into
		 * this render target or not.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.scissorTest = false;

		/**
		 * A rectangular area representing the render target's viewport.
		 *
		 * @type {Vector4}
		 * @default (0,0,width,height)
		 */
		this.viewport = new Vector4( 0, 0, width, height );

		const image = { width: width, height: height, depth: options.depth };

		const texture = new Texture( image );

		/**
		 * An array of textures. Each color attachment is represented as a separate texture.
		 * Has at least a single entry for the default color attachment.
		 *
		 * @type {Array<Texture>}
		 */
		this.textures = [];

		const count = options.count;
		for ( let i = 0; i < count; i ++ ) {

			this.textures[ i ] = texture.clone();
			this.textures[ i ].isRenderTargetTexture = true;
			this.textures[ i ].renderTarget = this;

		}

		this._setTextureOptions( options );

		/**
		 * Whether to allocate a depth buffer or not.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.depthBuffer = options.depthBuffer;

		/**
		 * Whether to allocate a stencil buffer or not.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.stencilBuffer = options.stencilBuffer;

		/**
		 * Whether to resolve the depth buffer or not.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.resolveDepthBuffer = options.resolveDepthBuffer;

		/**
		 * Whether to resolve the stencil buffer or not.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.resolveStencilBuffer = options.resolveStencilBuffer;

		this._depthTexture = null;
		this.depthTexture = options.depthTexture;

		/**
		 * The number of MSAA samples.
		 *
		 * A value of `0` disables MSAA.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.samples = options.samples;

		/**
		 * Whether to this target is used in multiview rendering.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.multiview = options.multiview;

	}

	_setTextureOptions( options = {} ) {

		const values = {
			minFilter: LinearFilter,
			generateMipmaps: false,
			flipY: false,
			internalFormat: null
		};

		if ( options.mapping !== undefined ) values.mapping = options.mapping;
		if ( options.wrapS !== undefined ) values.wrapS = options.wrapS;
		if ( options.wrapT !== undefined ) values.wrapT = options.wrapT;
		if ( options.wrapR !== undefined ) values.wrapR = options.wrapR;
		if ( options.magFilter !== undefined ) values.magFilter = options.magFilter;
		if ( options.minFilter !== undefined ) values.minFilter = options.minFilter;
		if ( options.format !== undefined ) values.format = options.format;
		if ( options.type !== undefined ) values.type = options.type;
		if ( options.anisotropy !== undefined ) values.anisotropy = options.anisotropy;
		if ( options.colorSpace !== undefined ) values.colorSpace = options.colorSpace;
		if ( options.flipY !== undefined ) values.flipY = options.flipY;
		if ( options.generateMipmaps !== undefined ) values.generateMipmaps = options.generateMipmaps;
		if ( options.internalFormat !== undefined ) values.internalFormat = options.internalFormat;

		for ( let i = 0; i < this.textures.length; i ++ ) {

			const texture = this.textures[ i ];
			texture.setValues( values );

		}

	}

	/**
	 * The texture representing the default color attachment.
	 *
	 * @type {Texture}
	 */
	get texture() {

		return this.textures[ 0 ];

	}

	set texture( value ) {

		this.textures[ 0 ] = value;

	}

	set depthTexture( current ) {

		if ( this._depthTexture !== null ) this._depthTexture.renderTarget = null;
		if ( current !== null ) current.renderTarget = this;

		this._depthTexture = current;

	}

	/**
	 * Instead of saving the depth in a renderbuffer, a texture
	 * can be used instead which is useful for further processing
	 * e.g. in context of post-processing.
	 *
	 * @type {?DepthTexture}
	 * @default null
	 */
	get depthTexture() {

		return this._depthTexture;

	}

	/**
	 * Sets the size of this render target.
	 *
	 * @param {number} width - The width.
	 * @param {number} height - The height.
	 * @param {number} [depth=1] - The depth.
	 */
	setSize( width, height, depth = 1 ) {

		if ( this.width !== width || this.height !== height || this.depth !== depth ) {

			this.width = width;
			this.height = height;
			this.depth = depth;

			for ( let i = 0, il = this.textures.length; i < il; i ++ ) {

				this.textures[ i ].image.width = width;
				this.textures[ i ].image.height = height;
				this.textures[ i ].image.depth = depth;
				this.textures[ i ].isArrayTexture = this.textures[ i ].image.depth > 1;

			}

			this.dispose();

		}

		this.viewport.set( 0, 0, width, height );
		this.scissor.set( 0, 0, width, height );

	}

	/**
	 * Returns a new render target with copied values from this instance.
	 *
	 * @return {RenderTarget} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	 * Copies the settings of the given render target. This is a structural copy so
	 * no resources are shared between render targets after the copy. That includes
	 * all MRT textures and the depth texture.
	 *
	 * @param {RenderTarget} source - The render target to copy.
	 * @return {RenderTarget} A reference to this instance.
	 */
	copy( source ) {

		this.width = source.width;
		this.height = source.height;
		this.depth = source.depth;

		this.scissor.copy( source.scissor );
		this.scissorTest = source.scissorTest;

		this.viewport.copy( source.viewport );

		this.textures.length = 0;

		for ( let i = 0, il = source.textures.length; i < il; i ++ ) {

			this.textures[ i ] = source.textures[ i ].clone();
			this.textures[ i ].isRenderTargetTexture = true;
			this.textures[ i ].renderTarget = this;

			// ensure image object is not shared, see #20328

			const image = Object.assign( {}, source.textures[ i ].image );
			this.textures[ i ].source = new Source( image );

		}

		this.depthBuffer = source.depthBuffer;
		this.stencilBuffer = source.stencilBuffer;

		this.resolveDepthBuffer = source.resolveDepthBuffer;
		this.resolveStencilBuffer = source.resolveStencilBuffer;

		if ( source.depthTexture !== null ) this.depthTexture = source.depthTexture.clone();

		this.samples = source.samples;

		return this;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 *
	 * @fires RenderTarget#dispose
	 */
	dispose() {

		this.dispatchEvent( { type: 'dispose' } );

	}

}

/**
 * A render target used in context of {@link WebGLRenderer}.
 *
 * @augments RenderTarget
 */
class WebGLRenderTarget extends RenderTarget {

	/**
	 * Constructs a new 3D render target.
	 *
	 * @param {number} [width=1] - The width of the render target.
	 * @param {number} [height=1] - The height of the render target.
	 * @param {RenderTarget~Options} [options] - The configuration object.
	 */
	constructor( width = 1, height = 1, options = {} ) {

		super( width, height, options );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isWebGLRenderTarget = true;

	}

}

/**
 * Creates an array of textures directly from raw buffer data.
 *
 * @augments Texture
 */
class DataArrayTexture extends Texture {

	/**
	 * Constructs a new data array texture.
	 *
	 * @param {?TypedArray} [data=null] - The buffer data.
	 * @param {number} [width=1] - The width of the texture.
	 * @param {number} [height=1] - The height of the texture.
	 * @param {number} [depth=1] - The depth of the texture.
	 */
	constructor( data = null, width = 1, height = 1, depth = 1 ) {

		super( null );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isDataArrayTexture = true;

		/**
		 * The image definition of a data texture.
		 *
		 * @type {{data:TypedArray,width:number,height:number,depth:number}}
		 */
		this.image = { data, width, height, depth };

		/**
		 * How the texture is sampled when a texel covers more than one pixel.
		 *
		 * Overwritten and set to `NearestFilter` by default.
		 *
		 * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
		 * @default NearestFilter
		 */
		this.magFilter = NearestFilter;

		/**
		 * How the texture is sampled when a texel covers less than one pixel.
		 *
		 * Overwritten and set to `NearestFilter` by default.
		 *
		 * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
		 * @default NearestFilter
		 */
		this.minFilter = NearestFilter;

		/**
		 * This defines how the texture is wrapped in the depth and corresponds to
		 * *W* in UVW mapping.
		 *
		 * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
		 * @default ClampToEdgeWrapping
		 */
		this.wrapR = ClampToEdgeWrapping;

		/**
		 * Whether to generate mipmaps (if possible) for a texture.
		 *
		 * Overwritten and set to `false` by default.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.generateMipmaps = false;

		/**
		 * If set to `true`, the texture is flipped along the vertical axis when
		 * uploaded to the GPU.
		 *
		 * Overwritten and set to `false` by default.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.flipY = false;

		/**
		 * Specifies the alignment requirements for the start of each pixel row in memory.
		 *
		 * Overwritten and set to `1` by default.
		 *
		 * @type {boolean}
		 * @default 1
		 */
		this.unpackAlignment = 1;

		/**
		 * A set of all layers which need to be updated in the texture.
		 *
		 * @type {Set<number>}
		 */
		this.layerUpdates = new Set();

	}

	/**
	 * Describes that a specific layer of the texture needs to be updated.
	 * Normally when {@link Texture#needsUpdate} is set to `true`, the
	 * entire data texture array is sent to the GPU. Marking specific
	 * layers will only transmit subsets of all mipmaps associated with a
	 * specific depth in the array which is often much more performant.
	 *
	 * @param {number} layerIndex - The layer index that should be updated.
	 */
	addLayerUpdate( layerIndex ) {

		this.layerUpdates.add( layerIndex );

	}

	/**
	 * Resets the layer updates registry.
	 */
	clearLayerUpdates() {

		this.layerUpdates.clear();

	}

}

/**
 * An array render target used in context of {@link WebGLRenderer}.
 *
 * @augments WebGLRenderTarget
 */
class WebGLArrayRenderTarget extends WebGLRenderTarget {

	/**
	 * Constructs a new array render target.
	 *
	 * @param {number} [width=1] - The width of the render target.
	 * @param {number} [height=1] - The height of the render target.
	 * @param {number} [depth=1] - The height of the render target.
	 * @param {RenderTarget~Options} [options] - The configuration object.
	 */
	constructor( width = 1, height = 1, depth = 1, options = {} ) {

		super( width, height, options );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isWebGLArrayRenderTarget = true;

		this.depth = depth;

		/**
		 * Overwritten with a different texture type.
		 *
		 * @type {DataArrayTexture}
		 */
		this.texture = new DataArrayTexture( null, width, height, depth );
		this._setTextureOptions( options );

		this.texture.isRenderTargetTexture = true;

	}

}

/**
 * Creates a three-dimensional texture from raw data, with parameters to
 * divide it into width, height, and depth.
 *
 * @augments Texture
 */
class Data3DTexture extends Texture {

	/**
	 * Constructs a new data array texture.
	 *
	 * @param {?TypedArray} [data=null] - The buffer data.
	 * @param {number} [width=1] - The width of the texture.
	 * @param {number} [height=1] - The height of the texture.
	 * @param {number} [depth=1] - The depth of the texture.
	 */
	constructor( data = null, width = 1, height = 1, depth = 1 ) {

		// We're going to add .setXXX() methods for setting properties later.
		// Users can still set in Data3DTexture directly.
		//
		//	const texture = new THREE.Data3DTexture( data, width, height, depth );
		// 	texture.anisotropy = 16;
		//
		// See #14839

		super( null );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isData3DTexture = true;

		/**
		 * The image definition of a data texture.
		 *
		 * @type {{data:TypedArray,width:number,height:number,depth:number}}
		 */
		this.image = { data, width, height, depth };

		/**
		 * How the texture is sampled when a texel covers more than one pixel.
		 *
		 * Overwritten and set to `NearestFilter` by default.
		 *
		 * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
		 * @default NearestFilter
		 */
		this.magFilter = NearestFilter;

		/**
		 * How the texture is sampled when a texel covers less than one pixel.
		 *
		 * Overwritten and set to `NearestFilter` by default.
		 *
		 * @type {(NearestFilter|NearestMipmapNearestFilter|NearestMipmapLinearFilter|LinearFilter|LinearMipmapNearestFilter|LinearMipmapLinearFilter)}
		 * @default NearestFilter
		 */
		this.minFilter = NearestFilter;

		/**
		 * This defines how the texture is wrapped in the depth and corresponds to
		 * *W* in UVW mapping.
		 *
		 * @type {(RepeatWrapping|ClampToEdgeWrapping|MirroredRepeatWrapping)}
		 * @default ClampToEdgeWrapping
		 */
		this.wrapR = ClampToEdgeWrapping;

		/**
		 * Whether to generate mipmaps (if possible) for a texture.
		 *
		 * Overwritten and set to `false` by default.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.generateMipmaps = false;

		/**
		 * If set to `true`, the texture is flipped along the vertical axis when
		 * uploaded to the GPU.
		 *
		 * Overwritten and set to `false` by default.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.flipY = false;

		/**
		 * Specifies the alignment requirements for the start of each pixel row in memory.
		 *
		 * Overwritten and set to `1` by default.
		 *
		 * @type {boolean}
		 * @default 1
		 */
		this.unpackAlignment = 1;

	}

}

/**
 * A 3D render target used in context of {@link WebGLRenderer}.
 *
 * @augments WebGLRenderTarget
 */
class WebGL3DRenderTarget extends WebGLRenderTarget {

	/**
	 * Constructs a new 3D render target.
	 *
	 * @param {number} [width=1] - The width of the render target.
	 * @param {number} [height=1] - The height of the render target.
	 * @param {number} [depth=1] - The height of the render target.
	 * @param {RenderTarget~Options} [options] - The configuration object.
	 */
	constructor( width = 1, height = 1, depth = 1, options = {} ) {

		super( width, height, options );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isWebGL3DRenderTarget = true;

		this.depth = depth;

		/**
		 * Overwritten with a different texture type.
		 *
		 * @type {Data3DTexture}
		 */
		this.texture = new Data3DTexture( null, width, height, depth );
		this._setTextureOptions( options );

		this.texture.isRenderTargetTexture = true;

	}

}

/**
 * Represents an axis-aligned bounding box (AABB) in 3D space.
 */
class Box3 {

	/**
	 * Constructs a new bounding box.
	 *
	 * @param {Vector3} [min=(Infinity,Infinity,Infinity)] - A vector representing the lower boundary of the box.
	 * @param {Vector3} [max=(-Infinity,-Infinity,-Infinity)] - A vector representing the upper boundary of the box.
	 */
	constructor( min = new Vector3( + Infinity, + Infinity, + Infinity ), max = new Vector3( - Infinity, - Infinity, - Infinity ) ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isBox3 = true;

		/**
		 * The lower boundary of the box.
		 *
		 * @type {Vector3}
		 */
		this.min = min;

		/**
		 * The upper boundary of the box.
		 *
		 * @type {Vector3}
		 */
		this.max = max;

	}

	/**
	 * Sets the lower and upper boundaries of this box.
	 * Please note that this method only copies the values from the given objects.
	 *
	 * @param {Vector3} min - The lower boundary of the box.
	 * @param {Vector3} max - The upper boundary of the box.
	 * @return {Box3} A reference to this bounding box.
	 */
	set( min, max ) {

		this.min.copy( min );
		this.max.copy( max );

		return this;

	}

	/**
	 * Sets the upper and lower bounds of this box so it encloses the position data
	 * in the given array.
	 *
	 * @param {Array<number>} array - An array holding 3D position data.
	 * @return {Box3} A reference to this bounding box.
	 */
	setFromArray( array ) {

		this.makeEmpty();

		for ( let i = 0, il = array.length; i < il; i += 3 ) {

			this.expandByPoint( _vector$b.fromArray( array, i ) );

		}

		return this;

	}

	/**
	 * Sets the upper and lower bounds of this box so it encloses the position data
	 * in the given buffer attribute.
	 *
	 * @param {BufferAttribute} attribute - A buffer attribute holding 3D position data.
	 * @return {Box3} A reference to this bounding box.
	 */
	setFromBufferAttribute( attribute ) {

		this.makeEmpty();

		for ( let i = 0, il = attribute.count; i < il; i ++ ) {

			this.expandByPoint( _vector$b.fromBufferAttribute( attribute, i ) );

		}

		return this;

	}

	/**
	 * Sets the upper and lower bounds of this box so it encloses the position data
	 * in the given array.
	 *
	 * @param {Array<Vector3>} points - An array holding 3D position data as instances of {@link Vector3}.
	 * @return {Box3} A reference to this bounding box.
	 */
	setFromPoints( points ) {

		this.makeEmpty();

		for ( let i = 0, il = points.length; i < il; i ++ ) {

			this.expandByPoint( points[ i ] );

		}

		return this;

	}

	/**
	 * Centers this box on the given center vector and sets this box's width, height and
	 * depth to the given size values.
	 *
	 * @param {Vector3} center - The center of the box.
	 * @param {Vector3} size - The x, y and z dimensions of the box.
	 * @return {Box3} A reference to this bounding box.
	 */
	setFromCenterAndSize( center, size ) {

		const halfSize = _vector$b.copy( size ).multiplyScalar( 0.5 );

		this.min.copy( center ).sub( halfSize );
		this.max.copy( center ).add( halfSize );

		return this;

	}

	/**
	 * Computes the world-axis-aligned bounding box for the given 3D object
	 * (including its children), accounting for the object's, and children's,
	 * world transforms. The function may result in a larger box than strictly necessary.
	 *
	 * @param {Object3D} object - The 3D object to compute the bounding box for.
	 * @param {boolean} [precise=false] - If set to `true`, the method computes the smallest
	 * world-axis-aligned bounding box at the expense of more computation.
	 * @return {Box3} A reference to this bounding box.
	 */
	setFromObject( object, precise = false ) {

		this.makeEmpty();

		return this.expandByObject( object, precise );

	}

	/**
	 * Returns a new box with copied values from this instance.
	 *
	 * @return {Box3} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	 * Copies the values of the given box to this instance.
	 *
	 * @param {Box3} box - The box to copy.
	 * @return {Box3} A reference to this bounding box.
	 */
	copy( box ) {

		this.min.copy( box.min );
		this.max.copy( box.max );

		return this;

	}

	/**
	 * Makes this box empty which means in encloses a zero space in 3D.
	 *
	 * @return {Box3} A reference to this bounding box.
	 */
	makeEmpty() {

		this.min.x = this.min.y = this.min.z = + Infinity;
		this.max.x = this.max.y = this.max.z = - Infinity;

		return this;

	}

	/**
	 * Returns true if this box includes zero points within its bounds.
	 * Note that a box with equal lower and upper bounds still includes one
	 * point, the one both bounds share.
	 *
	 * @return {boolean} Whether this box is empty or not.
	 */
	isEmpty() {

		// this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes

		return ( this.max.x < this.min.x ) || ( this.max.y < this.min.y ) || ( this.max.z < this.min.z );

	}

	/**
	 * Returns the center point of this box.
	 *
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The center point.
	 */
	getCenter( target ) {

		return this.isEmpty() ? target.set( 0, 0, 0 ) : target.addVectors( this.min, this.max ).multiplyScalar( 0.5 );

	}

	/**
	 * Returns the dimensions of this box.
	 *
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The size.
	 */
	getSize( target ) {

		return this.isEmpty() ? target.set( 0, 0, 0 ) : target.subVectors( this.max, this.min );

	}

	/**
	 * Expands the boundaries of this box to include the given point.
	 *
	 * @param {Vector3} point - The point that should be included by the bounding box.
	 * @return {Box3} A reference to this bounding box.
	 */
	expandByPoint( point ) {

		this.min.min( point );
		this.max.max( point );

		return this;

	}

	/**
	 * Expands this box equilaterally by the given vector. The width of this
	 * box will be expanded by the x component of the vector in both
	 * directions. The height of this box will be expanded by the y component of
	 * the vector in both directions. The depth of this box will be
	 * expanded by the z component of the vector in both directions.
	 *
	 * @param {Vector3} vector - The vector that should expand the bounding box.
	 * @return {Box3} A reference to this bounding box.
	 */
	expandByVector( vector ) {

		this.min.sub( vector );
		this.max.add( vector );

		return this;

	}

	/**
	 * Expands each dimension of the box by the given scalar. If negative, the
	 * dimensions of the box will be contracted.
	 *
	 * @param {number} scalar - The scalar value that should expand the bounding box.
	 * @return {Box3} A reference to this bounding box.
	 */
	expandByScalar( scalar ) {

		this.min.addScalar( - scalar );
		this.max.addScalar( scalar );

		return this;

	}

	/**
	 * Expands the boundaries of this box to include the given 3D object and
	 * its children, accounting for the object's, and children's, world
	 * transforms. The function may result in a larger box than strictly
	 * necessary (unless the precise parameter is set to true).
	 *
	 * @param {Object3D} object - The 3D object that should expand the bounding box.
	 * @param {boolean} precise - If set to `true`, the method expands the bounding box
	 * as little as necessary at the expense of more computation.
	 * @return {Box3} A reference to this bounding box.
	 */
	expandByObject( object, precise = false ) {

		// Computes the world-axis-aligned bounding box of an object (including its children),
		// accounting for both the object's, and children's, world transforms

		object.updateWorldMatrix( false, false );

		const geometry = object.geometry;

		if ( geometry !== undefined ) {

			const positionAttribute = geometry.getAttribute( 'position' );

			// precise AABB computation based on vertex data requires at least a position attribute.
			// instancing isn't supported so far and uses the normal (conservative) code path.

			if ( precise === true && positionAttribute !== undefined && object.isInstancedMesh !== true ) {

				for ( let i = 0, l = positionAttribute.count; i < l; i ++ ) {

					if ( object.isMesh === true ) {

						object.getVertexPosition( i, _vector$b );

					} else {

						_vector$b.fromBufferAttribute( positionAttribute, i );

					}

					_vector$b.applyMatrix4( object.matrixWorld );
					this.expandByPoint( _vector$b );

				}

			} else {

				if ( object.boundingBox !== undefined ) {

					// object-level bounding box

					if ( object.boundingBox === null ) {

						object.computeBoundingBox();

					}

					_box$4.copy( object.boundingBox );


				} else {

					// geometry-level bounding box

					if ( geometry.boundingBox === null ) {

						geometry.computeBoundingBox();

					}

					_box$4.copy( geometry.boundingBox );

				}

				_box$4.applyMatrix4( object.matrixWorld );

				this.union( _box$4 );

			}

		}

		const children = object.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			this.expandByObject( children[ i ], precise );

		}

		return this;

	}

	/**
	 * Returns `true` if the given point lies within or on the boundaries of this box.
	 *
	 * @param {Vector3} point - The point to test.
	 * @return {boolean} Whether the bounding box contains the given point or not.
	 */
	containsPoint( point ) {

		return point.x >= this.min.x && point.x <= this.max.x &&
			point.y >= this.min.y && point.y <= this.max.y &&
			point.z >= this.min.z && point.z <= this.max.z;

	}

	/**
	 * Returns `true` if this bounding box includes the entirety of the given bounding box.
	 * If this box and the given one are identical, this function also returns `true`.
	 *
	 * @param {Box3} box - The bounding box to test.
	 * @return {boolean} Whether the bounding box contains the given bounding box or not.
	 */
	containsBox( box ) {

		return this.min.x <= box.min.x && box.max.x <= this.max.x &&
			this.min.y <= box.min.y && box.max.y <= this.max.y &&
			this.min.z <= box.min.z && box.max.z <= this.max.z;

	}

	/**
	 * Returns a point as a proportion of this box's width, height and depth.
	 *
	 * @param {Vector3} point - A point in 3D space.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} A point as a proportion of this box's width, height and depth.
	 */
	getParameter( point, target ) {

		// This can potentially have a divide by zero if the box
		// has a size dimension of 0.

		return target.set(
			( point.x - this.min.x ) / ( this.max.x - this.min.x ),
			( point.y - this.min.y ) / ( this.max.y - this.min.y ),
			( point.z - this.min.z ) / ( this.max.z - this.min.z )
		);

	}

	/**
	 * Returns `true` if the given bounding box intersects with this bounding box.
	 *
	 * @param {Box3} box - The bounding box to test.
	 * @return {boolean} Whether the given bounding box intersects with this bounding box.
	 */
	intersectsBox( box ) {

		// using 6 splitting planes to rule out intersections.
		return box.max.x >= this.min.x && box.min.x <= this.max.x &&
			box.max.y >= this.min.y && box.min.y <= this.max.y &&
			box.max.z >= this.min.z && box.min.z <= this.max.z;

	}

	/**
	 * Returns `true` if the given bounding sphere intersects with this bounding box.
	 *
	 * @param {Sphere} sphere - The bounding sphere to test.
	 * @return {boolean} Whether the given bounding sphere intersects with this bounding box.
	 */
	intersectsSphere( sphere ) {

		// Find the point on the AABB closest to the sphere center.
		this.clampPoint( sphere.center, _vector$b );

		// If that point is inside the sphere, the AABB and sphere intersect.
		return _vector$b.distanceToSquared( sphere.center ) <= ( sphere.radius * sphere.radius );

	}

	/**
	 * Returns `true` if the given plane intersects with this bounding box.
	 *
	 * @param {Plane} plane - The plane to test.
	 * @return {boolean} Whether the given plane intersects with this bounding box.
	 */
	intersectsPlane( plane ) {

		// We compute the minimum and maximum dot product values. If those values
		// are on the same side (back or front) of the plane, then there is no intersection.

		let min, max;

		if ( plane.normal.x > 0 ) {

			min = plane.normal.x * this.min.x;
			max = plane.normal.x * this.max.x;

		} else {

			min = plane.normal.x * this.max.x;
			max = plane.normal.x * this.min.x;

		}

		if ( plane.normal.y > 0 ) {

			min += plane.normal.y * this.min.y;
			max += plane.normal.y * this.max.y;

		} else {

			min += plane.normal.y * this.max.y;
			max += plane.normal.y * this.min.y;

		}

		if ( plane.normal.z > 0 ) {

			min += plane.normal.z * this.min.z;
			max += plane.normal.z * this.max.z;

		} else {

			min += plane.normal.z * this.max.z;
			max += plane.normal.z * this.min.z;

		}

		return ( min <= - plane.constant && max >= - plane.constant );

	}

	/**
	 * Returns `true` if the given triangle intersects with this bounding box.
	 *
	 * @param {Triangle} triangle - The triangle to test.
	 * @return {boolean} Whether the given triangle intersects with this bounding box.
	 */
	intersectsTriangle( triangle ) {

		if ( this.isEmpty() ) {

			return false;

		}

		// compute box center and extents
		this.getCenter( _center );
		_extents.subVectors( this.max, _center );

		// translate triangle to aabb origin
		_v0$2.subVectors( triangle.a, _center );
		_v1$7.subVectors( triangle.b, _center );
		_v2$4.subVectors( triangle.c, _center );

		// compute edge vectors for triangle
		_f0.subVectors( _v1$7, _v0$2 );
		_f1.subVectors( _v2$4, _v1$7 );
		_f2.subVectors( _v0$2, _v2$4 );

		// test against axes that are given by cross product combinations of the edges of the triangle and the edges of the aabb
		// make an axis testing of each of the 3 sides of the aabb against each of the 3 sides of the triangle = 9 axis of separation
		// axis_ij = u_i x f_j (u0, u1, u2 = face normals of aabb = x,y,z axes vectors since aabb is axis aligned)
		let axes = [
			0, - _f0.z, _f0.y, 0, - _f1.z, _f1.y, 0, - _f2.z, _f2.y,
			_f0.z, 0, - _f0.x, _f1.z, 0, - _f1.x, _f2.z, 0, - _f2.x,
			- _f0.y, _f0.x, 0, - _f1.y, _f1.x, 0, - _f2.y, _f2.x, 0
		];
		if ( ! satForAxes( axes, _v0$2, _v1$7, _v2$4, _extents ) ) {

			return false;

		}

		// test 3 face normals from the aabb
		axes = [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ];
		if ( ! satForAxes( axes, _v0$2, _v1$7, _v2$4, _extents ) ) {

			return false;

		}

		// finally testing the face normal of the triangle
		// use already existing triangle edge vectors here
		_triangleNormal.crossVectors( _f0, _f1 );
		axes = [ _triangleNormal.x, _triangleNormal.y, _triangleNormal.z ];

		return satForAxes( axes, _v0$2, _v1$7, _v2$4, _extents );

	}

	/**
	 * Clamps the given point within the bounds of this box.
	 *
	 * @param {Vector3} point - The point to clamp.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The clamped point.
	 */
	clampPoint( point, target ) {

		return target.copy( point ).clamp( this.min, this.max );

	}

	/**
	 * Returns the euclidean distance from any edge of this box to the specified point. If
	 * the given point lies inside of this box, the distance will be `0`.
	 *
	 * @param {Vector3} point - The point to compute the distance to.
	 * @return {number} The euclidean distance.
	 */
	distanceToPoint( point ) {

		return this.clampPoint( point, _vector$b ).distanceTo( point );

	}

	/**
	 * Returns a bounding sphere that encloses this bounding box.
	 *
	 * @param {Sphere} target - The target sphere that is used to store the method's result.
	 * @return {Sphere} The bounding sphere that encloses this bounding box.
	 */
	getBoundingSphere( target ) {

		if ( this.isEmpty() ) {

			target.makeEmpty();

		} else {

			this.getCenter( target.center );

			target.radius = this.getSize( _vector$b ).length() * 0.5;

		}

		return target;

	}

	/**
	 * Computes the intersection of this bounding box and the given one, setting the upper
	 * bound of this box to the lesser of the two boxes' upper bounds and the
	 * lower bound of this box to the greater of the two boxes' lower bounds. If
	 * there's no overlap, makes this box empty.
	 *
	 * @param {Box3} box - The bounding box to intersect with.
	 * @return {Box3} A reference to this bounding box.
	 */
	intersect( box ) {

		this.min.max( box.min );
		this.max.min( box.max );

		// ensure that if there is no overlap, the result is fully empty, not slightly empty with non-inf/+inf values that will cause subsequence intersects to erroneously return valid values.
		if ( this.isEmpty() ) this.makeEmpty();

		return this;

	}

	/**
	 * Computes the union of this box and another and the given one, setting the upper
	 * bound of this box to the greater of the two boxes' upper bounds and the
	 * lower bound of this box to the lesser of the two boxes' lower bounds.
	 *
	 * @param {Box3} box - The bounding box that will be unioned with this instance.
	 * @return {Box3} A reference to this bounding box.
	 */
	union( box ) {

		this.min.min( box.min );
		this.max.max( box.max );

		return this;

	}

	/**
	 * Transforms this bounding box by the given 4x4 transformation matrix.
	 *
	 * @param {Matrix4} matrix - The transformation matrix.
	 * @return {Box3} A reference to this bounding box.
	 */
	applyMatrix4( matrix ) {

		// transform of empty box is an empty box.
		if ( this.isEmpty() ) return this;

		// NOTE: I am using a binary pattern to specify all 2^3 combinations below
		_points[ 0 ].set( this.min.x, this.min.y, this.min.z ).applyMatrix4( matrix ); // 000
		_points[ 1 ].set( this.min.x, this.min.y, this.max.z ).applyMatrix4( matrix ); // 001
		_points[ 2 ].set( this.min.x, this.max.y, this.min.z ).applyMatrix4( matrix ); // 010
		_points[ 3 ].set( this.min.x, this.max.y, this.max.z ).applyMatrix4( matrix ); // 011
		_points[ 4 ].set( this.max.x, this.min.y, this.min.z ).applyMatrix4( matrix ); // 100
		_points[ 5 ].set( this.max.x, this.min.y, this.max.z ).applyMatrix4( matrix ); // 101
		_points[ 6 ].set( this.max.x, this.max.y, this.min.z ).applyMatrix4( matrix ); // 110
		_points[ 7 ].set( this.max.x, this.max.y, this.max.z ).applyMatrix4( matrix ); // 111

		this.setFromPoints( _points );

		return this;

	}

	/**
	 * Adds the given offset to both the upper and lower bounds of this bounding box,
	 * effectively moving it in 3D space.
	 *
	 * @param {Vector3} offset - The offset that should be used to translate the bounding box.
	 * @return {Box3} A reference to this bounding box.
	 */
	translate( offset ) {

		this.min.add( offset );
		this.max.add( offset );

		return this;

	}

	/**
	 * Returns `true` if this bounding box is equal with the given one.
	 *
	 * @param {Box3} box - The box to test for equality.
	 * @return {boolean} Whether this bounding box is equal with the given one.
	 */
	equals( box ) {

		return box.min.equals( this.min ) && box.max.equals( this.max );

	}

	/**
	 * Returns a serialized structure of the bounding box.
	 *
	 * @return {Object} Serialized structure with fields representing the object state.
	 */
	toJSON() {

		return {
			min: this.min.toArray(),
			max: this.max.toArray()
		};

	}

	/**
	 * Returns a serialized structure of the bounding box.
	 *
	 * @param {Object} json - The serialized json to set the box from.
	 * @return {Box3} A reference to this bounding box.
	 */
	fromJSON( json ) {

		this.min.fromArray( json.min );
		this.max.fromArray( json.max );
		return this;

	}

}

const _points = [
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3(),
	/*@__PURE__*/ new Vector3()
];

const _vector$b = /*@__PURE__*/ new Vector3();

const _box$4 = /*@__PURE__*/ new Box3();

// triangle centered vertices

const _v0$2 = /*@__PURE__*/ new Vector3();
const _v1$7 = /*@__PURE__*/ new Vector3();
const _v2$4 = /*@__PURE__*/ new Vector3();

// triangle edge vectors

const _f0 = /*@__PURE__*/ new Vector3();
const _f1 = /*@__PURE__*/ new Vector3();
const _f2 = /*@__PURE__*/ new Vector3();

const _center = /*@__PURE__*/ new Vector3();
const _extents = /*@__PURE__*/ new Vector3();
const _triangleNormal = /*@__PURE__*/ new Vector3();
const _testAxis = /*@__PURE__*/ new Vector3();

function satForAxes( axes, v0, v1, v2, extents ) {

	for ( let i = 0, j = axes.length - 3; i <= j; i += 3 ) {

		_testAxis.fromArray( axes, i );
		// project the aabb onto the separating axis
		const r = extents.x * Math.abs( _testAxis.x ) + extents.y * Math.abs( _testAxis.y ) + extents.z * Math.abs( _testAxis.z );
		// project all 3 vertices of the triangle onto the separating axis
		const p0 = v0.dot( _testAxis );
		const p1 = v1.dot( _testAxis );
		const p2 = v2.dot( _testAxis );
		// actual test, basically see if either of the most extreme of the triangle points intersects r
		if ( Math.max( - Math.max( p0, p1, p2 ), Math.min( p0, p1, p2 ) ) > r ) {

			// points of the projected triangle are outside the projected half-length of the aabb
			// the axis is separating and we can exit
			return false;

		}

	}

	return true;

}

const _box$3 = /*@__PURE__*/ new Box3();
const _v1$6 = /*@__PURE__*/ new Vector3();
const _v2$3 = /*@__PURE__*/ new Vector3();

/**
 * An analytical 3D sphere defined by a center and radius. This class is mainly
 * used as a Bounding Sphere for 3D objects.
 */
class Sphere {

	/**
	 * Constructs a new sphere.
	 *
	 * @param {Vector3} [center=(0,0,0)] - The center of the sphere
	 * @param {number} [radius=-1] - The radius of the sphere.
	 */
	constructor( center = new Vector3(), radius = -1 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isSphere = true;

		/**
		 * The center of the sphere
		 *
		 * @type {Vector3}
		 */
		this.center = center;

		/**
		 * The radius of the sphere.
		 *
		 * @type {number}
		 */
		this.radius = radius;

	}

	/**
	 * Sets the sphere's components by copying the given values.
	 *
	 * @param {Vector3} center - The center.
	 * @param {number} radius - The radius.
	 * @return {Sphere} A reference to this sphere.
	 */
	set( center, radius ) {

		this.center.copy( center );
		this.radius = radius;

		return this;

	}

	/**
	 * Computes the minimum bounding sphere for list of points.
	 * If the optional center point is given, it is used as the sphere's
	 * center. Otherwise, the center of the axis-aligned bounding box
	 * encompassing the points is calculated.
	 *
	 * @param {Array<Vector3>} points - A list of points in 3D space.
	 * @param {Vector3} [optionalCenter] - The center of the sphere.
	 * @return {Sphere} A reference to this sphere.
	 */
	setFromPoints( points, optionalCenter ) {

		const center = this.center;

		if ( optionalCenter !== undefined ) {

			center.copy( optionalCenter );

		} else {

			_box$3.setFromPoints( points ).getCenter( center );

		}

		let maxRadiusSq = 0;

		for ( let i = 0, il = points.length; i < il; i ++ ) {

			maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( points[ i ] ) );

		}

		this.radius = Math.sqrt( maxRadiusSq );

		return this;

	}

	/**
	 * Copies the values of the given sphere to this instance.
	 *
	 * @param {Sphere} sphere - The sphere to copy.
	 * @return {Sphere} A reference to this sphere.
	 */
	copy( sphere ) {

		this.center.copy( sphere.center );
		this.radius = sphere.radius;

		return this;

	}

	/**
	 * Returns `true` if the sphere is empty (the radius set to a negative number).
	 *
	 * Spheres with a radius of `0` contain only their center point and are not
	 * considered to be empty.
	 *
	 * @return {boolean} Whether this sphere is empty or not.
	 */
	isEmpty() {

		return ( this.radius < 0 );

	}

	/**
	 * Makes this sphere empty which means in encloses a zero space in 3D.
	 *
	 * @return {Sphere} A reference to this sphere.
	 */
	makeEmpty() {

		this.center.set( 0, 0, 0 );
		this.radius = -1;

		return this;

	}

	/**
	 * Returns `true` if this sphere contains the given point inclusive of
	 * the surface of the sphere.
	 *
	 * @param {Vector3} point - The point to check.
	 * @return {boolean} Whether this sphere contains the given point or not.
	 */
	containsPoint( point ) {

		return ( point.distanceToSquared( this.center ) <= ( this.radius * this.radius ) );

	}

	/**
	 * Returns the closest distance from the boundary of the sphere to the
	 * given point. If the sphere contains the point, the distance will
	 * be negative.
	 *
	 * @param {Vector3} point - The point to compute the distance to.
	 * @return {number} The distance to the point.
	 */
	distanceToPoint( point ) {

		return ( point.distanceTo( this.center ) - this.radius );

	}

	/**
	 * Returns `true` if this sphere intersects with the given one.
	 *
	 * @param {Sphere} sphere - The sphere to test.
	 * @return {boolean} Whether this sphere intersects with the given one or not.
	 */
	intersectsSphere( sphere ) {

		const radiusSum = this.radius + sphere.radius;

		return sphere.center.distanceToSquared( this.center ) <= ( radiusSum * radiusSum );

	}

	/**
	 * Returns `true` if this sphere intersects with the given box.
	 *
	 * @param {Box3} box - The box to test.
	 * @return {boolean} Whether this sphere intersects with the given box or not.
	 */
	intersectsBox( box ) {

		return box.intersectsSphere( this );

	}

	/**
	 * Returns `true` if this sphere intersects with the given plane.
	 *
	 * @param {Plane} plane - The plane to test.
	 * @return {boolean} Whether this sphere intersects with the given plane or not.
	 */
	intersectsPlane( plane ) {

		return Math.abs( plane.distanceToPoint( this.center ) ) <= this.radius;

	}

	/**
	 * Clamps a point within the sphere. If the point is outside the sphere, it
	 * will clamp it to the closest point on the edge of the sphere. Points
	 * already inside the sphere will not be affected.
	 *
	 * @param {Vector3} point - The plane to clamp.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The clamped point.
	 */
	clampPoint( point, target ) {

		const deltaLengthSq = this.center.distanceToSquared( point );

		target.copy( point );

		if ( deltaLengthSq > ( this.radius * this.radius ) ) {

			target.sub( this.center ).normalize();
			target.multiplyScalar( this.radius ).add( this.center );

		}

		return target;

	}

	/**
	 * Returns a bounding box that encloses this sphere.
	 *
	 * @param {Box3} target - The target box that is used to store the method's result.
	 * @return {Box3} The bounding box that encloses this sphere.
	 */
	getBoundingBox( target ) {

		if ( this.isEmpty() ) {

			// Empty sphere produces empty bounding box
			target.makeEmpty();
			return target;

		}

		target.set( this.center, this.center );
		target.expandByScalar( this.radius );

		return target;

	}

	/**
	 * Transforms this sphere with the given 4x4 transformation matrix.
	 *
	 * @param {Matrix4} matrix - The transformation matrix.
	 * @return {Sphere} A reference to this sphere.
	 */
	applyMatrix4( matrix ) {

		this.center.applyMatrix4( matrix );
		this.radius = this.radius * matrix.getMaxScaleOnAxis();

		return this;

	}

	/**
	 * Translates the sphere's center by the given offset.
	 *
	 * @param {Vector3} offset - The offset.
	 * @return {Sphere} A reference to this sphere.
	 */
	translate( offset ) {

		this.center.add( offset );

		return this;

	}

	/**
	 * Expands the boundaries of this sphere to include the given point.
	 *
	 * @param {Vector3} point - The point to include.
	 * @return {Sphere} A reference to this sphere.
	 */
	expandByPoint( point ) {

		if ( this.isEmpty() ) {

			this.center.copy( point );

			this.radius = 0;

			return this;

		}

		_v1$6.subVectors( point, this.center );

		const lengthSq = _v1$6.lengthSq();

		if ( lengthSq > ( this.radius * this.radius ) ) {

			// calculate the minimal sphere

			const length = Math.sqrt( lengthSq );

			const delta = ( length - this.radius ) * 0.5;

			this.center.addScaledVector( _v1$6, delta / length );

			this.radius += delta;

		}

		return this;

	}

	/**
	 * Expands this sphere to enclose both the original sphere and the given sphere.
	 *
	 * @param {Sphere} sphere - The sphere to include.
	 * @return {Sphere} A reference to this sphere.
	 */
	union( sphere ) {

		if ( sphere.isEmpty() ) {

			return this;

		}

		if ( this.isEmpty() ) {

			this.copy( sphere );

			return this;

		}

		if ( this.center.equals( sphere.center ) === true ) {

			 this.radius = Math.max( this.radius, sphere.radius );

		} else {

			_v2$3.subVectors( sphere.center, this.center ).setLength( sphere.radius );

			this.expandByPoint( _v1$6.copy( sphere.center ).add( _v2$3 ) );

			this.expandByPoint( _v1$6.copy( sphere.center ).sub( _v2$3 ) );

		}

		return this;

	}

	/**
	 * Returns `true` if this sphere is equal with the given one.
	 *
	 * @param {Sphere} sphere - The sphere to test for equality.
	 * @return {boolean} Whether this bounding sphere is equal with the given one.
	 */
	equals( sphere ) {

		return sphere.center.equals( this.center ) && ( sphere.radius === this.radius );

	}

	/**
	 * Returns a new sphere with copied values from this instance.
	 *
	 * @return {Sphere} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	 * Returns a serialized structure of the bounding sphere.
	 *
	 * @return {Object} Serialized structure with fields representing the object state.
	 */
	toJSON() {

		return {
			radius: this.radius,
			center: this.center.toArray()
		};

	}

	/**
	 * Returns a serialized structure of the bounding sphere.
	 *
	 * @param {Object} json - The serialized json to set the sphere from.
	 * @return {Box3} A reference to this bounding sphere.
	 */
	fromJSON( json ) {

		this.radius = json.radius;
		this.center.fromArray( json.center );
		return this;

	}

}

const _vector$a = /*@__PURE__*/ new Vector3();
const _segCenter = /*@__PURE__*/ new Vector3();
const _segDir = /*@__PURE__*/ new Vector3();
const _diff = /*@__PURE__*/ new Vector3();

const _edge1 = /*@__PURE__*/ new Vector3();
const _edge2 = /*@__PURE__*/ new Vector3();
const _normal$1 = /*@__PURE__*/ new Vector3();

/**
 * A ray that emits from an origin in a certain direction. The class is used by
 * {@link Raycaster} to assist with raycasting. Raycasting is used for
 * mouse picking (working out what objects in the 3D space the mouse is over)
 * amongst other things.
 */
class Ray {

	/**
	 * Constructs a new ray.
	 *
	 * @param {Vector3} [origin=(0,0,0)] - The origin of the ray.
	 * @param {Vector3} [direction=(0,0,-1)] - The (normalized) direction of the ray.
	 */
	constructor( origin = new Vector3(), direction = new Vector3( 0, 0, -1 ) ) {

		/**
		 * The origin of the ray.
		 *
		 * @type {Vector3}
		 */
		this.origin = origin;

		/**
		 * The (normalized) direction of the ray.
		 *
		 * @type {Vector3}
		 */
		this.direction = direction;

	}

	/**
	 * Sets the ray's components by copying the given values.
	 *
	 * @param {Vector3} origin - The origin.
	 * @param {Vector3} direction - The direction.
	 * @return {Ray} A reference to this ray.
	 */
	set( origin, direction ) {

		this.origin.copy( origin );
		this.direction.copy( direction );

		return this;

	}

	/**
	 * Copies the values of the given ray to this instance.
	 *
	 * @param {Ray} ray - The ray to copy.
	 * @return {Ray} A reference to this ray.
	 */
	copy( ray ) {

		this.origin.copy( ray.origin );
		this.direction.copy( ray.direction );

		return this;

	}

	/**
	 * Returns a vector that is located at a given distance along this ray.
	 *
	 * @param {number} t - The distance along the ray to retrieve a position for.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} A position on the ray.
	 */
	at( t, target ) {

		return target.copy( this.origin ).addScaledVector( this.direction, t );

	}

	/**
	 * Adjusts the direction of the ray to point at the given vector in world space.
	 *
	 * @param {Vector3} v - The target position.
	 * @return {Ray} A reference to this ray.
	 */
	lookAt( v ) {

		this.direction.copy( v ).sub( this.origin ).normalize();

		return this;

	}

	/**
	 * Shift the origin of this ray along its direction by the given distance.
	 *
	 * @param {number} t - The distance along the ray to interpolate.
	 * @return {Ray} A reference to this ray.
	 */
	recast( t ) {

		this.origin.copy( this.at( t, _vector$a ) );

		return this;

	}

	/**
	 * Returns the point along this ray that is closest to the given point.
	 *
	 * @param {Vector3} point - A point in 3D space to get the closet location on the ray for.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The closest point on this ray.
	 */
	closestPointToPoint( point, target ) {

		target.subVectors( point, this.origin );

		const directionDistance = target.dot( this.direction );

		if ( directionDistance < 0 ) {

			return target.copy( this.origin );

		}

		return target.copy( this.origin ).addScaledVector( this.direction, directionDistance );

	}

	/**
	 * Returns the distance of the closest approach between this ray and the given point.
	 *
	 * @param {Vector3} point - A point in 3D space to compute the distance to.
	 * @return {number} The distance.
	 */
	distanceToPoint( point ) {

		return Math.sqrt( this.distanceSqToPoint( point ) );

	}

	/**
	 * Returns the squared distance of the closest approach between this ray and the given point.
	 *
	 * @param {Vector3} point - A point in 3D space to compute the distance to.
	 * @return {number} The squared distance.
	 */
	distanceSqToPoint( point ) {

		const directionDistance = _vector$a.subVectors( point, this.origin ).dot( this.direction );

		// point behind the ray

		if ( directionDistance < 0 ) {

			return this.origin.distanceToSquared( point );

		}

		_vector$a.copy( this.origin ).addScaledVector( this.direction, directionDistance );

		return _vector$a.distanceToSquared( point );

	}

	/**
	 * Returns the squared distance between this ray and the given line segment.
	 *
	 * @param {Vector3} v0 - The start point of the line segment.
	 * @param {Vector3} v1 - The end point of the line segment.
	 * @param {Vector3} [optionalPointOnRay] - When provided, it receives the point on this ray that is closest to the segment.
	 * @param {Vector3} [optionalPointOnSegment] - When provided, it receives the point on the line segment that is closest to this ray.
	 * @return {number} The squared distance.
	 */
	distanceSqToSegment( v0, v1, optionalPointOnRay, optionalPointOnSegment ) {

		// from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteDistRaySegment.h
		// It returns the min distance between the ray and the segment
		// defined by v0 and v1
		// It can also set two optional targets :
		// - The closest point on the ray
		// - The closest point on the segment

		_segCenter.copy( v0 ).add( v1 ).multiplyScalar( 0.5 );
		_segDir.copy( v1 ).sub( v0 ).normalize();
		_diff.copy( this.origin ).sub( _segCenter );

		const segExtent = v0.distanceTo( v1 ) * 0.5;
		const a01 = - this.direction.dot( _segDir );
		const b0 = _diff.dot( this.direction );
		const b1 = - _diff.dot( _segDir );
		const c = _diff.lengthSq();
		const det = Math.abs( 1 - a01 * a01 );
		let s0, s1, sqrDist, extDet;

		if ( det > 0 ) {

			// The ray and segment are not parallel.

			s0 = a01 * b1 - b0;
			s1 = a01 * b0 - b1;
			extDet = segExtent * det;

			if ( s0 >= 0 ) {

				if ( s1 >= - extDet ) {

					if ( s1 <= extDet ) {

						// region 0
						// Minimum at interior points of ray and segment.

						const invDet = 1 / det;
						s0 *= invDet;
						s1 *= invDet;
						sqrDist = s0 * ( s0 + a01 * s1 + 2 * b0 ) + s1 * ( a01 * s0 + s1 + 2 * b1 ) + c;

					} else {

						// region 1

						s1 = segExtent;
						s0 = Math.max( 0, - ( a01 * s1 + b0 ) );
						sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

					}

				} else {

					// region 5

					s1 = - segExtent;
					s0 = Math.max( 0, - ( a01 * s1 + b0 ) );
					sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

				}

			} else {

				if ( s1 <= - extDet ) {

					// region 4

					s0 = Math.max( 0, - ( - a01 * segExtent + b0 ) );
					s1 = ( s0 > 0 ) ? - segExtent : Math.min( Math.max( - segExtent, - b1 ), segExtent );
					sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

				} else if ( s1 <= extDet ) {

					// region 3

					s0 = 0;
					s1 = Math.min( Math.max( - segExtent, - b1 ), segExtent );
					sqrDist = s1 * ( s1 + 2 * b1 ) + c;

				} else {

					// region 2

					s0 = Math.max( 0, - ( a01 * segExtent + b0 ) );
					s1 = ( s0 > 0 ) ? segExtent : Math.min( Math.max( - segExtent, - b1 ), segExtent );
					sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

				}

			}

		} else {

			// Ray and segment are parallel.

			s1 = ( a01 > 0 ) ? - segExtent : segExtent;
			s0 = Math.max( 0, - ( a01 * s1 + b0 ) );
			sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

		}

		if ( optionalPointOnRay ) {

			optionalPointOnRay.copy( this.origin ).addScaledVector( this.direction, s0 );

		}

		if ( optionalPointOnSegment ) {

			optionalPointOnSegment.copy( _segCenter ).addScaledVector( _segDir, s1 );

		}

		return sqrDist;

	}

	/**
	 * Intersects this ray with the given sphere, returning the intersection
	 * point or `null` if there is no intersection.
	 *
	 * @param {Sphere} sphere - The sphere to intersect.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {?Vector3} The intersection point.
	 */
	intersectSphere( sphere, target ) {

		_vector$a.subVectors( sphere.center, this.origin );
		const tca = _vector$a.dot( this.direction );
		const d2 = _vector$a.dot( _vector$a ) - tca * tca;
		const radius2 = sphere.radius * sphere.radius;

		if ( d2 > radius2 ) return null;

		const thc = Math.sqrt( radius2 - d2 );

		// t0 = first intersect point - entrance on front of sphere
		const t0 = tca - thc;

		// t1 = second intersect point - exit point on back of sphere
		const t1 = tca + thc;

		// test to see if t1 is behind the ray - if so, return null
		if ( t1 < 0 ) return null;

		// test to see if t0 is behind the ray:
		// if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
		// in order to always return an intersect point that is in front of the ray.
		if ( t0 < 0 ) return this.at( t1, target );

		// else t0 is in front of the ray, so return the first collision point scaled by t0
		return this.at( t0, target );

	}

	/**
	 * Returns `true` if this ray intersects with the given sphere.
	 *
	 * @param {Sphere} sphere - The sphere to intersect.
	 * @return {boolean} Whether this ray intersects with the given sphere or not.
	 */
	intersectsSphere( sphere ) {

		if ( sphere.radius < 0 ) return false; // handle empty spheres, see #31187

		return this.distanceSqToPoint( sphere.center ) <= ( sphere.radius * sphere.radius );

	}

	/**
	 * Computes the distance from the ray's origin to the given plane. Returns `null` if the ray
	 * does not intersect with the plane.
	 *
	 * @param {Plane} plane - The plane to compute the distance to.
	 * @return {?number} Whether this ray intersects with the given sphere or not.
	 */
	distanceToPlane( plane ) {

		const denominator = plane.normal.dot( this.direction );

		if ( denominator === 0 ) {

			// line is coplanar, return origin
			if ( plane.distanceToPoint( this.origin ) === 0 ) {

				return 0;

			}

			// Null is preferable to undefined since undefined means.... it is undefined

			return null;

		}

		const t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

		// Return if the ray never intersects the plane

		return t >= 0 ? t : null;

	}

	/**
	 * Intersects this ray with the given plane, returning the intersection
	 * point or `null` if there is no intersection.
	 *
	 * @param {Plane} plane - The plane to intersect.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {?Vector3} The intersection point.
	 */
	intersectPlane( plane, target ) {

		const t = this.distanceToPlane( plane );

		if ( t === null ) {

			return null;

		}

		return this.at( t, target );

	}

	/**
	 * Returns `true` if this ray intersects with the given plane.
	 *
	 * @param {Plane} plane - The plane to intersect.
	 * @return {boolean} Whether this ray intersects with the given plane or not.
	 */
	intersectsPlane( plane ) {

		// check if the ray lies on the plane first

		const distToPoint = plane.distanceToPoint( this.origin );

		if ( distToPoint === 0 ) {

			return true;

		}

		const denominator = plane.normal.dot( this.direction );

		if ( denominator * distToPoint < 0 ) {

			return true;

		}

		// ray origin is behind the plane (and is pointing behind it)

		return false;

	}

	/**
	 * Intersects this ray with the given bounding box, returning the intersection
	 * point or `null` if there is no intersection.
	 *
	 * @param {Box3} box - The box to intersect.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {?Vector3} The intersection point.
	 */
	intersectBox( box, target ) {

		let tmin, tmax, tymin, tymax, tzmin, tzmax;

		const invdirx = 1 / this.direction.x,
			invdiry = 1 / this.direction.y,
			invdirz = 1 / this.direction.z;

		const origin = this.origin;

		if ( invdirx >= 0 ) {

			tmin = ( box.min.x - origin.x ) * invdirx;
			tmax = ( box.max.x - origin.x ) * invdirx;

		} else {

			tmin = ( box.max.x - origin.x ) * invdirx;
			tmax = ( box.min.x - origin.x ) * invdirx;

		}

		if ( invdiry >= 0 ) {

			tymin = ( box.min.y - origin.y ) * invdiry;
			tymax = ( box.max.y - origin.y ) * invdiry;

		} else {

			tymin = ( box.max.y - origin.y ) * invdiry;
			tymax = ( box.min.y - origin.y ) * invdiry;

		}

		if ( ( tmin > tymax ) || ( tymin > tmax ) ) return null;

		if ( tymin > tmin || isNaN( tmin ) ) tmin = tymin;

		if ( tymax < tmax || isNaN( tmax ) ) tmax = tymax;

		if ( invdirz >= 0 ) {

			tzmin = ( box.min.z - origin.z ) * invdirz;
			tzmax = ( box.max.z - origin.z ) * invdirz;

		} else {

			tzmin = ( box.max.z - origin.z ) * invdirz;
			tzmax = ( box.min.z - origin.z ) * invdirz;

		}

		if ( ( tmin > tzmax ) || ( tzmin > tmax ) ) return null;

		if ( tzmin > tmin || tmin !== tmin ) tmin = tzmin;

		if ( tzmax < tmax || tmax !== tmax ) tmax = tzmax;

		//return point closest to the ray (positive side)

		if ( tmax < 0 ) return null;

		return this.at( tmin >= 0 ? tmin : tmax, target );

	}

	/**
	 * Returns `true` if this ray intersects with the given box.
	 *
	 * @param {Box3} box - The box to intersect.
	 * @return {boolean} Whether this ray intersects with the given box or not.
	 */
	intersectsBox( box ) {

		return this.intersectBox( box, _vector$a ) !== null;

	}

	/**
	 * Intersects this ray with the given triangle, returning the intersection
	 * point or `null` if there is no intersection.
	 *
	 * @param {Vector3} a - The first vertex of the triangle.
	 * @param {Vector3} b - The second vertex of the triangle.
	 * @param {Vector3} c - The third vertex of the triangle.
	 * @param {boolean} backfaceCulling - Whether to use backface culling or not.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {?Vector3} The intersection point.
	 */
	intersectTriangle( a, b, c, backfaceCulling, target ) {

		// Compute the offset origin, edges, and normal.

		// from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteIntrRay3Triangle3.h

		_edge1.subVectors( b, a );
		_edge2.subVectors( c, a );
		_normal$1.crossVectors( _edge1, _edge2 );

		// Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
		// E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
		//   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
		//   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
		//   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
		let DdN = this.direction.dot( _normal$1 );
		let sign;

		if ( DdN > 0 ) {

			if ( backfaceCulling ) return null;
			sign = 1;

		} else if ( DdN < 0 ) {

			sign = -1;
			DdN = - DdN;

		} else {

			return null;

		}

		_diff.subVectors( this.origin, a );
		const DdQxE2 = sign * this.direction.dot( _edge2.crossVectors( _diff, _edge2 ) );

		// b1 < 0, no intersection
		if ( DdQxE2 < 0 ) {

			return null;

		}

		const DdE1xQ = sign * this.direction.dot( _edge1.cross( _diff ) );

		// b2 < 0, no intersection
		if ( DdE1xQ < 0 ) {

			return null;

		}

		// b1+b2 > 1, no intersection
		if ( DdQxE2 + DdE1xQ > DdN ) {

			return null;

		}

		// Line intersects triangle, check if ray does.
		const QdN = - sign * _diff.dot( _normal$1 );

		// t < 0, no intersection
		if ( QdN < 0 ) {

			return null;

		}

		// Ray intersects triangle.
		return this.at( QdN / DdN, target );

	}

	/**
	 * Transforms this ray with the given 4x4 transformation matrix.
	 *
	 * @param {Matrix4} matrix4 - The transformation matrix.
	 * @return {Ray} A reference to this ray.
	 */
	applyMatrix4( matrix4 ) {

		this.origin.applyMatrix4( matrix4 );
		this.direction.transformDirection( matrix4 );

		return this;

	}

	/**
	 * Returns `true` if this ray is equal with the given one.
	 *
	 * @param {Ray} ray - The ray to test for equality.
	 * @return {boolean} Whether this ray is equal with the given one.
	 */
	equals( ray ) {

		return ray.origin.equals( this.origin ) && ray.direction.equals( this.direction );

	}

	/**
	 * Returns a new ray with copied values from this instance.
	 *
	 * @return {Ray} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

}

/**
 * Represents a 4x4 matrix.
 *
 * The most common use of a 4x4 matrix in 3D computer graphics is as a transformation matrix.
 * For an introduction to transformation matrices as used in WebGL, check out [this tutorial]{@link https://www.opengl-tutorial.org/beginners-tutorials/tutorial-3-matrices}
 *
 * This allows a 3D vector representing a point in 3D space to undergo
 * transformations such as translation, rotation, shear, scale, reflection,
 * orthogonal or perspective projection and so on, by being multiplied by the
 * matrix. This is known as `applying` the matrix to the vector.
 *
 * A Note on Row-Major and Column-Major Ordering:
 *
 * The constructor and {@link Matrix3#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix3#elements} array in column-major order.
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix4();
 * m.set( 11, 12, 13, 14,
 *        21, 22, 23, 24,
 *        31, 32, 33, 34,
 *        41, 42, 43, 44 );
 * ```
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21, 31, 41,
 *                12, 22, 32, 42,
 *                13, 23, 33, 43,
 *                14, 24, 34, 44 ];
 * ```
 * and internally all calculations are performed using column-major ordering.
 * However, as the actual ordering makes no difference mathematically and
 * most people are used to thinking about matrices in row-major order, the
 * three.js documentation shows matrices in row-major order. Just bear in
 * mind that if you are reading the source code, you'll have to take the
 * transpose of any matrices outlined here to make sense of the calculations.
 */
class Matrix4 {

	/**
	 * Constructs a new 4x4 matrix. The arguments are supposed to be
	 * in row-major order. If no arguments are provided, the constructor
	 * initializes the matrix as an identity matrix.
	 *
	 * @param {number} [n11] - 1-1 matrix element.
	 * @param {number} [n12] - 1-2 matrix element.
	 * @param {number} [n13] - 1-3 matrix element.
	 * @param {number} [n14] - 1-4 matrix element.
	 * @param {number} [n21] - 2-1 matrix element.
	 * @param {number} [n22] - 2-2 matrix element.
	 * @param {number} [n23] - 2-3 matrix element.
	 * @param {number} [n24] - 2-4 matrix element.
	 * @param {number} [n31] - 3-1 matrix element.
	 * @param {number} [n32] - 3-2 matrix element.
	 * @param {number} [n33] - 3-3 matrix element.
	 * @param {number} [n34] - 3-4 matrix element.
	 * @param {number} [n41] - 4-1 matrix element.
	 * @param {number} [n42] - 4-2 matrix element.
	 * @param {number} [n43] - 4-3 matrix element.
	 * @param {number} [n44] - 4-4 matrix element.
	 */
	constructor( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		Matrix4.prototype.isMatrix4 = true;

		/**
		 * A column-major list of matrix values.
		 *
		 * @type {Array<number>}
		 */
		this.elements = [

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		];

		if ( n11 !== undefined ) {

			this.set( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 );

		}

	}

	/**
	 * Sets the elements of the matrix.The arguments are supposed to be
	 * in row-major order.
	 *
	 * @param {number} [n11] - 1-1 matrix element.
	 * @param {number} [n12] - 1-2 matrix element.
	 * @param {number} [n13] - 1-3 matrix element.
	 * @param {number} [n14] - 1-4 matrix element.
	 * @param {number} [n21] - 2-1 matrix element.
	 * @param {number} [n22] - 2-2 matrix element.
	 * @param {number} [n23] - 2-3 matrix element.
	 * @param {number} [n24] - 2-4 matrix element.
	 * @param {number} [n31] - 3-1 matrix element.
	 * @param {number} [n32] - 3-2 matrix element.
	 * @param {number} [n33] - 3-3 matrix element.
	 * @param {number} [n34] - 3-4 matrix element.
	 * @param {number} [n41] - 4-1 matrix element.
	 * @param {number} [n42] - 4-2 matrix element.
	 * @param {number} [n43] - 4-3 matrix element.
	 * @param {number} [n44] - 4-4 matrix element.
	 * @return {Matrix4} A reference to this matrix.
	 */
	set( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 4 ] = n12; te[ 8 ] = n13; te[ 12 ] = n14;
		te[ 1 ] = n21; te[ 5 ] = n22; te[ 9 ] = n23; te[ 13 ] = n24;
		te[ 2 ] = n31; te[ 6 ] = n32; te[ 10 ] = n33; te[ 14 ] = n34;
		te[ 3 ] = n41; te[ 7 ] = n42; te[ 11 ] = n43; te[ 15 ] = n44;

		return this;

	}

	/**
	 * Sets this matrix to the 4x4 identity matrix.
	 *
	 * @return {Matrix4} A reference to this matrix.
	 */
	identity() {

		this.set(

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Returns a matrix with copied values from this instance.
	 *
	 * @return {Matrix4} A clone of this instance.
	 */
	clone() {

		return new Matrix4().fromArray( this.elements );

	}

	/**
	 * Copies the values of the given matrix to this instance.
	 *
	 * @param {Matrix4} m - The matrix to copy.
	 * @return {Matrix4} A reference to this matrix.
	 */
	copy( m ) {

		const te = this.elements;
		const me = m.elements;

		te[ 0 ] = me[ 0 ]; te[ 1 ] = me[ 1 ]; te[ 2 ] = me[ 2 ]; te[ 3 ] = me[ 3 ];
		te[ 4 ] = me[ 4 ]; te[ 5 ] = me[ 5 ]; te[ 6 ] = me[ 6 ]; te[ 7 ] = me[ 7 ];
		te[ 8 ] = me[ 8 ]; te[ 9 ] = me[ 9 ]; te[ 10 ] = me[ 10 ]; te[ 11 ] = me[ 11 ];
		te[ 12 ] = me[ 12 ]; te[ 13 ] = me[ 13 ]; te[ 14 ] = me[ 14 ]; te[ 15 ] = me[ 15 ];

		return this;

	}

	/**
	 * Copies the translation component of the given matrix
	 * into this matrix's translation component.
	 *
	 * @param {Matrix4} m - The matrix to copy the translation component.
	 * @return {Matrix4} A reference to this matrix.
	 */
	copyPosition( m ) {

		const te = this.elements, me = m.elements;

		te[ 12 ] = me[ 12 ];
		te[ 13 ] = me[ 13 ];
		te[ 14 ] = me[ 14 ];

		return this;

	}

	/**
	 * Set the upper 3x3 elements of this matrix to the values of given 3x3 matrix.
	 *
	 * @param {Matrix3} m - The 3x3 matrix.
	 * @return {Matrix4} A reference to this matrix.
	 */
	setFromMatrix3( m ) {

		const me = m.elements;

		this.set(

			me[ 0 ], me[ 3 ], me[ 6 ], 0,
			me[ 1 ], me[ 4 ], me[ 7 ], 0,
			me[ 2 ], me[ 5 ], me[ 8 ], 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Extracts the basis of this matrix into the three axis vectors provided.
	 *
	 * @param {Vector3} xAxis - The basis's x axis.
	 * @param {Vector3} yAxis - The basis's y axis.
	 * @param {Vector3} zAxis - The basis's z axis.
	 * @return {Matrix4} A reference to this matrix.
	 */
	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.setFromMatrixColumn( this, 0 );
		yAxis.setFromMatrixColumn( this, 1 );
		zAxis.setFromMatrixColumn( this, 2 );

		return this;

	}

	/**
	 * Sets the given basis vectors to this matrix.
	 *
	 * @param {Vector3} xAxis - The basis's x axis.
	 * @param {Vector3} yAxis - The basis's y axis.
	 * @param {Vector3} zAxis - The basis's z axis.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeBasis( xAxis, yAxis, zAxis ) {

		this.set(
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			0, 0, 0, 1
		);

		return this;

	}

	/**
	 * Extracts the rotation component of the given matrix
	 * into this matrix's rotation component.
	 *
	 * Note: This method does not support reflection matrices.
	 *
	 * @param {Matrix4} m - The matrix.
	 * @return {Matrix4} A reference to this matrix.
	 */
	extractRotation( m ) {

		const te = this.elements;
		const me = m.elements;

		const scaleX = 1 / _v1$5.setFromMatrixColumn( m, 0 ).length();
		const scaleY = 1 / _v1$5.setFromMatrixColumn( m, 1 ).length();
		const scaleZ = 1 / _v1$5.setFromMatrixColumn( m, 2 ).length();

		te[ 0 ] = me[ 0 ] * scaleX;
		te[ 1 ] = me[ 1 ] * scaleX;
		te[ 2 ] = me[ 2 ] * scaleX;
		te[ 3 ] = 0;

		te[ 4 ] = me[ 4 ] * scaleY;
		te[ 5 ] = me[ 5 ] * scaleY;
		te[ 6 ] = me[ 6 ] * scaleY;
		te[ 7 ] = 0;

		te[ 8 ] = me[ 8 ] * scaleZ;
		te[ 9 ] = me[ 9 ] * scaleZ;
		te[ 10 ] = me[ 10 ] * scaleZ;
		te[ 11 ] = 0;

		te[ 12 ] = 0;
		te[ 13 ] = 0;
		te[ 14 ] = 0;
		te[ 15 ] = 1;

		return this;

	}

	/**
	 * Sets the rotation component (the upper left 3x3 matrix) of this matrix to
	 * the rotation specified by the given Euler angles. The rest of
	 * the matrix is set to the identity. Depending on the {@link Euler#order},
	 * there are six possible outcomes. See [this page]{@link https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix}
	 * for a complete list.
	 *
	 * @param {Euler} euler - The Euler angles.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeRotationFromEuler( euler ) {

		const te = this.elements;

		const x = euler.x, y = euler.y, z = euler.z;
		const a = Math.cos( x ), b = Math.sin( x );
		const c = Math.cos( y ), d = Math.sin( y );
		const e = Math.cos( z ), f = Math.sin( z );

		if ( euler.order === 'XYZ' ) {

			const ae = a * e, af = a * f, be = b * e, bf = b * f;

			te[ 0 ] = c * e;
			te[ 4 ] = - c * f;
			te[ 8 ] = d;

			te[ 1 ] = af + be * d;
			te[ 5 ] = ae - bf * d;
			te[ 9 ] = - b * c;

			te[ 2 ] = bf - ae * d;
			te[ 6 ] = be + af * d;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'YXZ' ) {

			const ce = c * e, cf = c * f, de = d * e, df = d * f;

			te[ 0 ] = ce + df * b;
			te[ 4 ] = de * b - cf;
			te[ 8 ] = a * d;

			te[ 1 ] = a * f;
			te[ 5 ] = a * e;
			te[ 9 ] = - b;

			te[ 2 ] = cf * b - de;
			te[ 6 ] = df + ce * b;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'ZXY' ) {

			const ce = c * e, cf = c * f, de = d * e, df = d * f;

			te[ 0 ] = ce - df * b;
			te[ 4 ] = - a * f;
			te[ 8 ] = de + cf * b;

			te[ 1 ] = cf + de * b;
			te[ 5 ] = a * e;
			te[ 9 ] = df - ce * b;

			te[ 2 ] = - a * d;
			te[ 6 ] = b;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'ZYX' ) {

			const ae = a * e, af = a * f, be = b * e, bf = b * f;

			te[ 0 ] = c * e;
			te[ 4 ] = be * d - af;
			te[ 8 ] = ae * d + bf;

			te[ 1 ] = c * f;
			te[ 5 ] = bf * d + ae;
			te[ 9 ] = af * d - be;

			te[ 2 ] = - d;
			te[ 6 ] = b * c;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'YZX' ) {

			const ac = a * c, ad = a * d, bc = b * c, bd = b * d;

			te[ 0 ] = c * e;
			te[ 4 ] = bd - ac * f;
			te[ 8 ] = bc * f + ad;

			te[ 1 ] = f;
			te[ 5 ] = a * e;
			te[ 9 ] = - b * e;

			te[ 2 ] = - d * e;
			te[ 6 ] = ad * f + bc;
			te[ 10 ] = ac - bd * f;

		} else if ( euler.order === 'XZY' ) {

			const ac = a * c, ad = a * d, bc = b * c, bd = b * d;

			te[ 0 ] = c * e;
			te[ 4 ] = - f;
			te[ 8 ] = d * e;

			te[ 1 ] = ac * f + bd;
			te[ 5 ] = a * e;
			te[ 9 ] = ad * f - bc;

			te[ 2 ] = bc * f - ad;
			te[ 6 ] = b * e;
			te[ 10 ] = bd * f + ac;

		}

		// bottom row
		te[ 3 ] = 0;
		te[ 7 ] = 0;
		te[ 11 ] = 0;

		// last column
		te[ 12 ] = 0;
		te[ 13 ] = 0;
		te[ 14 ] = 0;
		te[ 15 ] = 1;

		return this;

	}

	/**
	 * Sets the rotation component of this matrix to the rotation specified by
	 * the given Quaternion as outlined [here]{@link https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion}
	 * The rest of the matrix is set to the identity.
	 *
	 * @param {Quaternion} q - The Quaternion.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeRotationFromQuaternion( q ) {

		return this.compose( _zero, q, _one );

	}

	/**
	 * Sets the rotation component of the transformation matrix, looking from `eye` towards
	 * `target`, and oriented by the up-direction.
	 *
	 * @param {Vector3} eye - The eye vector.
	 * @param {Vector3} target - The target vector.
	 * @param {Vector3} up - The up vector.
	 * @return {Matrix4} A reference to this matrix.
	 */
	lookAt( eye, target, up ) {

		const te = this.elements;

		_z.subVectors( eye, target );

		if ( _z.lengthSq() === 0 ) {

			// eye and target are in the same position

			_z.z = 1;

		}

		_z.normalize();
		_x.crossVectors( up, _z );

		if ( _x.lengthSq() === 0 ) {

			// up and z are parallel

			if ( Math.abs( up.z ) === 1 ) {

				_z.x += 0.0001;

			} else {

				_z.z += 0.0001;

			}

			_z.normalize();
			_x.crossVectors( up, _z );

		}

		_x.normalize();
		_y.crossVectors( _z, _x );

		te[ 0 ] = _x.x; te[ 4 ] = _y.x; te[ 8 ] = _z.x;
		te[ 1 ] = _x.y; te[ 5 ] = _y.y; te[ 9 ] = _z.y;
		te[ 2 ] = _x.z; te[ 6 ] = _y.z; te[ 10 ] = _z.z;

		return this;

	}

	/**
	 * Post-multiplies this matrix by the given 4x4 matrix.
	 *
	 * @param {Matrix4} m - The matrix to multiply with.
	 * @return {Matrix4} A reference to this matrix.
	 */
	multiply( m ) {

		return this.multiplyMatrices( this, m );

	}

	/**
	 * Pre-multiplies this matrix by the given 4x4 matrix.
	 *
	 * @param {Matrix4} m - The matrix to multiply with.
	 * @return {Matrix4} A reference to this matrix.
	 */
	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	/**
	 * Multiples the given 4x4 matrices and stores the result
	 * in this matrix.
	 *
	 * @param {Matrix4} a - The first matrix.
	 * @param {Matrix4} b - The second matrix.
	 * @return {Matrix4} A reference to this matrix.
	 */
	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const te = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
		const a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
		const a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
		const a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];

		const b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
		const b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
		const b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
		const b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];

		te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
		te[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
		te[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
		te[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

		te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
		te[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
		te[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
		te[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

		te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
		te[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
		te[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
		te[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

		te[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
		te[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
		te[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
		te[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

		return this;

	}

	/**
	 * Multiplies every component of the matrix by the given scalar.
	 *
	 * @param {number} s - The scalar.
	 * @return {Matrix4} A reference to this matrix.
	 */
	multiplyScalar( s ) {

		const te = this.elements;

		te[ 0 ] *= s; te[ 4 ] *= s; te[ 8 ] *= s; te[ 12 ] *= s;
		te[ 1 ] *= s; te[ 5 ] *= s; te[ 9 ] *= s; te[ 13 ] *= s;
		te[ 2 ] *= s; te[ 6 ] *= s; te[ 10 ] *= s; te[ 14 ] *= s;
		te[ 3 ] *= s; te[ 7 ] *= s; te[ 11 ] *= s; te[ 15 ] *= s;

		return this;

	}

	/**
	 * Computes and returns the determinant of this matrix.
	 *
	 * Based on the method outlined [here]{@link http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.html}.
	 *
	 * @return {number} The determinant.
	 */
	determinant() {

		const te = this.elements;

		const n11 = te[ 0 ], n12 = te[ 4 ], n13 = te[ 8 ], n14 = te[ 12 ];
		const n21 = te[ 1 ], n22 = te[ 5 ], n23 = te[ 9 ], n24 = te[ 13 ];
		const n31 = te[ 2 ], n32 = te[ 6 ], n33 = te[ 10 ], n34 = te[ 14 ];
		const n41 = te[ 3 ], n42 = te[ 7 ], n43 = te[ 11 ], n44 = te[ 15 ];

		//TODO: make this more efficient

		return (
			n41 * (
				+ n14 * n23 * n32
				 - n13 * n24 * n32
				 - n14 * n22 * n33
				 + n12 * n24 * n33
				 + n13 * n22 * n34
				 - n12 * n23 * n34
			) +
			n42 * (
				+ n11 * n23 * n34
				 - n11 * n24 * n33
				 + n14 * n21 * n33
				 - n13 * n21 * n34
				 + n13 * n24 * n31
				 - n14 * n23 * n31
			) +
			n43 * (
				+ n11 * n24 * n32
				 - n11 * n22 * n34
				 - n14 * n21 * n32
				 + n12 * n21 * n34
				 + n14 * n22 * n31
				 - n12 * n24 * n31
			) +
			n44 * (
				- n13 * n22 * n31
				 - n11 * n23 * n32
				 + n11 * n22 * n33
				 + n13 * n21 * n32
				 - n12 * n21 * n33
				 + n12 * n23 * n31
			)

		);

	}

	/**
	 * Transposes this matrix in place.
	 *
	 * @return {Matrix4} A reference to this matrix.
	 */
	transpose() {

		const te = this.elements;
		let tmp;

		tmp = te[ 1 ]; te[ 1 ] = te[ 4 ]; te[ 4 ] = tmp;
		tmp = te[ 2 ]; te[ 2 ] = te[ 8 ]; te[ 8 ] = tmp;
		tmp = te[ 6 ]; te[ 6 ] = te[ 9 ]; te[ 9 ] = tmp;

		tmp = te[ 3 ]; te[ 3 ] = te[ 12 ]; te[ 12 ] = tmp;
		tmp = te[ 7 ]; te[ 7 ] = te[ 13 ]; te[ 13 ] = tmp;
		tmp = te[ 11 ]; te[ 11 ] = te[ 14 ]; te[ 14 ] = tmp;

		return this;

	}

	/**
	 * Sets the position component for this matrix from the given vector,
	 * without affecting the rest of the matrix.
	 *
	 * @param {number|Vector3} x - The x component of the vector or alternatively the vector object.
	 * @param {number} y - The y component of the vector.
	 * @param {number} z - The z component of the vector.
	 * @return {Matrix4} A reference to this matrix.
	 */
	setPosition( x, y, z ) {

		const te = this.elements;

		if ( x.isVector3 ) {

			te[ 12 ] = x.x;
			te[ 13 ] = x.y;
			te[ 14 ] = x.z;

		} else {

			te[ 12 ] = x;
			te[ 13 ] = y;
			te[ 14 ] = z;

		}

		return this;

	}

	/**
	 * Inverts this matrix, using the [analytic method]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}.
	 * You can not invert with a determinant of zero. If you attempt this, the method produces
	 * a zero matrix instead.
	 *
	 * @return {Matrix4} A reference to this matrix.
	 */
	invert() {

		// based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
		const te = this.elements,

			n11 = te[ 0 ], n21 = te[ 1 ], n31 = te[ 2 ], n41 = te[ 3 ],
			n12 = te[ 4 ], n22 = te[ 5 ], n32 = te[ 6 ], n42 = te[ 7 ],
			n13 = te[ 8 ], n23 = te[ 9 ], n33 = te[ 10 ], n43 = te[ 11 ],
			n14 = te[ 12 ], n24 = te[ 13 ], n34 = te[ 14 ], n44 = te[ 15 ],

			t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
			t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
			t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
			t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

		const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

		if ( det === 0 ) return this.set( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 );

		const detInv = 1 / det;

		te[ 0 ] = t11 * detInv;
		te[ 1 ] = ( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv;
		te[ 2 ] = ( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv;
		te[ 3 ] = ( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv;

		te[ 4 ] = t12 * detInv;
		te[ 5 ] = ( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv;
		te[ 6 ] = ( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv;
		te[ 7 ] = ( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv;

		te[ 8 ] = t13 * detInv;
		te[ 9 ] = ( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv;
		te[ 10 ] = ( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv;
		te[ 11 ] = ( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv;

		te[ 12 ] = t14 * detInv;
		te[ 13 ] = ( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv;
		te[ 14 ] = ( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv;
		te[ 15 ] = ( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv;

		return this;

	}

	/**
	 * Multiplies the columns of this matrix by the given vector.
	 *
	 * @param {Vector3} v - The scale vector.
	 * @return {Matrix4} A reference to this matrix.
	 */
	scale( v ) {

		const te = this.elements;
		const x = v.x, y = v.y, z = v.z;

		te[ 0 ] *= x; te[ 4 ] *= y; te[ 8 ] *= z;
		te[ 1 ] *= x; te[ 5 ] *= y; te[ 9 ] *= z;
		te[ 2 ] *= x; te[ 6 ] *= y; te[ 10 ] *= z;
		te[ 3 ] *= x; te[ 7 ] *= y; te[ 11 ] *= z;

		return this;

	}

	/**
	 * Gets the maximum scale value of the three axes.
	 *
	 * @return {number} The maximum scale.
	 */
	getMaxScaleOnAxis() {

		const te = this.elements;

		const scaleXSq = te[ 0 ] * te[ 0 ] + te[ 1 ] * te[ 1 ] + te[ 2 ] * te[ 2 ];
		const scaleYSq = te[ 4 ] * te[ 4 ] + te[ 5 ] * te[ 5 ] + te[ 6 ] * te[ 6 ];
		const scaleZSq = te[ 8 ] * te[ 8 ] + te[ 9 ] * te[ 9 ] + te[ 10 ] * te[ 10 ];

		return Math.sqrt( Math.max( scaleXSq, scaleYSq, scaleZSq ) );

	}

	/**
	 * Sets this matrix as a translation transform from the given vector.
	 *
	 * @param {number|Vector3} x - The amount to translate in the X axis or alternatively a translation vector.
	 * @param {number} y - The amount to translate in the Y axis.
	 * @param {number} z - The amount to translate in the z axis.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeTranslation( x, y, z ) {

		if ( x.isVector3 ) {

			this.set(

				1, 0, 0, x.x,
				0, 1, 0, x.y,
				0, 0, 1, x.z,
				0, 0, 0, 1

			);

		} else {

			this.set(

				1, 0, 0, x,
				0, 1, 0, y,
				0, 0, 1, z,
				0, 0, 0, 1

			);

		}

		return this;

	}

	/**
	 * Sets this matrix as a rotational transformation around the X axis by
	 * the given angle.
	 *
	 * @param {number} theta - The rotation in radians.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeRotationX( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			1, 0, 0, 0,
			0, c, - s, 0,
			0, s, c, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix as a rotational transformation around the Y axis by
	 * the given angle.
	 *
	 * @param {number} theta - The rotation in radians.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeRotationY( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			 c, 0, s, 0,
			 0, 1, 0, 0,
			- s, 0, c, 0,
			 0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix as a rotational transformation around the Z axis by
	 * the given angle.
	 *
	 * @param {number} theta - The rotation in radians.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeRotationZ( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			c, - s, 0, 0,
			s, c, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix as a rotational transformation around the given axis by
	 * the given angle.
	 *
	 * This is a somewhat controversial but mathematically sound alternative to
	 * rotating via Quaternions. See the discussion [here]{@link https://www.gamedev.net/articles/programming/math-and-physics/do-we-really-need-quaternions-r1199}.
	 *
	 * @param {Vector3} axis - The normalized rotation axis.
	 * @param {number} angle - The rotation in radians.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeRotationAxis( axis, angle ) {

		// Based on http://www.gamedev.net/reference/articles/article1199.asp

		const c = Math.cos( angle );
		const s = Math.sin( angle );
		const t = 1 - c;
		const x = axis.x, y = axis.y, z = axis.z;
		const tx = t * x, ty = t * y;

		this.set(

			tx * x + c, tx * y - s * z, tx * z + s * y, 0,
			tx * y + s * z, ty * y + c, ty * z - s * x, 0,
			tx * z - s * y, ty * z + s * x, t * z * z + c, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix as a scale transformation.
	 *
	 * @param {number} x - The amount to scale in the X axis.
	 * @param {number} y - The amount to scale in the Y axis.
	 * @param {number} z - The amount to scale in the Z axis.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeScale( x, y, z ) {

		this.set(

			x, 0, 0, 0,
			0, y, 0, 0,
			0, 0, z, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix as a shear transformation.
	 *
	 * @param {number} xy - The amount to shear X by Y.
	 * @param {number} xz - The amount to shear X by Z.
	 * @param {number} yx - The amount to shear Y by X.
	 * @param {number} yz - The amount to shear Y by Z.
	 * @param {number} zx - The amount to shear Z by X.
	 * @param {number} zy - The amount to shear Z by Y.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeShear( xy, xz, yx, yz, zx, zy ) {

		this.set(

			1, yx, zx, 0,
			xy, 1, zy, 0,
			xz, yz, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	 * Sets this matrix to the transformation composed of the given position,
	 * rotation (Quaternion) and scale.
	 *
	 * @param {Vector3} position - The position vector.
	 * @param {Quaternion} quaternion - The rotation as a Quaternion.
	 * @param {Vector3} scale - The scale vector.
	 * @return {Matrix4} A reference to this matrix.
	 */
	compose( position, quaternion, scale ) {

		const te = this.elements;

		const x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w;
		const x2 = x + x,	y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		const sx = scale.x, sy = scale.y, sz = scale.z;

		te[ 0 ] = ( 1 - ( yy + zz ) ) * sx;
		te[ 1 ] = ( xy + wz ) * sx;
		te[ 2 ] = ( xz - wy ) * sx;
		te[ 3 ] = 0;

		te[ 4 ] = ( xy - wz ) * sy;
		te[ 5 ] = ( 1 - ( xx + zz ) ) * sy;
		te[ 6 ] = ( yz + wx ) * sy;
		te[ 7 ] = 0;

		te[ 8 ] = ( xz + wy ) * sz;
		te[ 9 ] = ( yz - wx ) * sz;
		te[ 10 ] = ( 1 - ( xx + yy ) ) * sz;
		te[ 11 ] = 0;

		te[ 12 ] = position.x;
		te[ 13 ] = position.y;
		te[ 14 ] = position.z;
		te[ 15 ] = 1;

		return this;

	}

	/**
	 * Decomposes this matrix into its position, rotation and scale components
	 * and provides the result in the given objects.
	 *
	 * Note: Not all matrices are decomposable in this way. For example, if an
	 * object has a non-uniformly scaled parent, then the object's world matrix
	 * may not be decomposable, and this method may not be appropriate.
	 *
	 * @param {Vector3} position - The position vector.
	 * @param {Quaternion} quaternion - The rotation as a Quaternion.
	 * @param {Vector3} scale - The scale vector.
	 * @return {Matrix4} A reference to this matrix.
	 */
	decompose( position, quaternion, scale ) {

		const te = this.elements;

		let sx = _v1$5.set( te[ 0 ], te[ 1 ], te[ 2 ] ).length();
		const sy = _v1$5.set( te[ 4 ], te[ 5 ], te[ 6 ] ).length();
		const sz = _v1$5.set( te[ 8 ], te[ 9 ], te[ 10 ] ).length();

		// if determine is negative, we need to invert one scale
		const det = this.determinant();
		if ( det < 0 ) sx = - sx;

		position.x = te[ 12 ];
		position.y = te[ 13 ];
		position.z = te[ 14 ];

		// scale the rotation part
		_m1$2.copy( this );

		const invSX = 1 / sx;
		const invSY = 1 / sy;
		const invSZ = 1 / sz;

		_m1$2.elements[ 0 ] *= invSX;
		_m1$2.elements[ 1 ] *= invSX;
		_m1$2.elements[ 2 ] *= invSX;

		_m1$2.elements[ 4 ] *= invSY;
		_m1$2.elements[ 5 ] *= invSY;
		_m1$2.elements[ 6 ] *= invSY;

		_m1$2.elements[ 8 ] *= invSZ;
		_m1$2.elements[ 9 ] *= invSZ;
		_m1$2.elements[ 10 ] *= invSZ;

		quaternion.setFromRotationMatrix( _m1$2 );

		scale.x = sx;
		scale.y = sy;
		scale.z = sz;

		return this;

	}

	/**
	 * Creates a perspective projection matrix. This is used internally by
	 * {@link PerspectiveCamera#updateProjectionMatrix}.

	 * @param {number} left - Left boundary of the viewing frustum at the near plane.
	 * @param {number} right - Right boundary of the viewing frustum at the near plane.
	 * @param {number} top - Top boundary of the viewing frustum at the near plane.
	 * @param {number} bottom - Bottom boundary of the viewing frustum at the near plane.
	 * @param {number} near - The distance from the camera to the near plane.
	 * @param {number} far - The distance from the camera to the far plane.
	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - The coordinate system.
	 * @param {boolean} [reversedDepth=false] - Whether to use a reversed depth.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makePerspective( left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false ) {

		const te = this.elements;

		const x = 2 * near / ( right - left );
		const y = 2 * near / ( top - bottom );

		const a = ( right + left ) / ( right - left );
		const b = ( top + bottom ) / ( top - bottom );

		let c, d;

		if ( reversedDepth ) {

			c = near / ( far - near );
			d = ( far * near ) / ( far - near );

		} else {

			if ( coordinateSystem === WebGLCoordinateSystem ) {

				c = - ( far + near ) / ( far - near );
				d = ( -2 * far * near ) / ( far - near );

			} else if ( coordinateSystem === WebGPUCoordinateSystem ) {

				c = - far / ( far - near );
				d = ( - far * near ) / ( far - near );

			} else {

				throw new Error( 'THREE.Matrix4.makePerspective(): Invalid coordinate system: ' + coordinateSystem );

			}

		}

		te[ 0 ] = x;	te[ 4 ] = 0;	te[ 8 ] = a; 	te[ 12 ] = 0;
		te[ 1 ] = 0;	te[ 5 ] = y;	te[ 9 ] = b; 	te[ 13 ] = 0;
		te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = c; 	te[ 14 ] = d;
		te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = -1;	te[ 15 ] = 0;

		return this;

	}

	/**
	 * Creates a orthographic projection matrix. This is used internally by
	 * {@link OrthographicCamera#updateProjectionMatrix}.

	 * @param {number} left - Left boundary of the viewing frustum at the near plane.
	 * @param {number} right - Right boundary of the viewing frustum at the near plane.
	 * @param {number} top - Top boundary of the viewing frustum at the near plane.
	 * @param {number} bottom - Bottom boundary of the viewing frustum at the near plane.
	 * @param {number} near - The distance from the camera to the near plane.
	 * @param {number} far - The distance from the camera to the far plane.
	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - The coordinate system.
	 * @param {boolean} [reversedDepth=false] - Whether to use a reversed depth.
	 * @return {Matrix4} A reference to this matrix.
	 */
	makeOrthographic( left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = false ) {

		const te = this.elements;

		const x = 2 / ( right - left );
		const y = 2 / ( top - bottom );

		const a = - ( right + left ) / ( right - left );
		const b = - ( top + bottom ) / ( top - bottom );

		let c, d;

		if ( reversedDepth ) {

			c = 1 / ( far - near );
			d = far / ( far - near );

		} else {

			if ( coordinateSystem === WebGLCoordinateSystem ) {

				c = -2 / ( far - near );
				d = - ( far + near ) / ( far - near );

			} else if ( coordinateSystem === WebGPUCoordinateSystem ) {

				c = -1 / ( far - near );
				d = - near / ( far - near );

			} else {

				throw new Error( 'THREE.Matrix4.makeOrthographic(): Invalid coordinate system: ' + coordinateSystem );

			}

		}

		te[ 0 ] = x;		te[ 4 ] = 0;		te[ 8 ] = 0; 		te[ 12 ] = a;
		te[ 1 ] = 0; 		te[ 5 ] = y;		te[ 9 ] = 0; 		te[ 13 ] = b;
		te[ 2 ] = 0; 		te[ 6 ] = 0;		te[ 10 ] = c;		te[ 14 ] = d;
		te[ 3 ] = 0; 		te[ 7 ] = 0;		te[ 11 ] = 0;		te[ 15 ] = 1;

		return this;

	}

	/**
	 * Returns `true` if this matrix is equal with the given one.
	 *
	 * @param {Matrix4} matrix - The matrix to test for equality.
	 * @return {boolean} Whether this matrix is equal with the given one.
	 */
	equals( matrix ) {

		const te = this.elements;
		const me = matrix.elements;

		for ( let i = 0; i < 16; i ++ ) {

			if ( te[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

	/**
	 * Sets the elements of the matrix from the given array.
	 *
	 * @param {Array<number>} array - The matrix elements in column-major order.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Matrix4} A reference to this matrix.
	 */
	fromArray( array, offset = 0 ) {

		for ( let i = 0; i < 16; i ++ ) {

			this.elements[ i ] = array[ i + offset ];

		}

		return this;

	}

	/**
	 * Writes the elements of this matrix to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number>} [array=[]] - The target array holding the matrix elements in column-major order.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number>} The matrix elements in column-major order.
	 */
	toArray( array = [], offset = 0 ) {

		const te = this.elements;

		array[ offset ] = te[ 0 ];
		array[ offset + 1 ] = te[ 1 ];
		array[ offset + 2 ] = te[ 2 ];
		array[ offset + 3 ] = te[ 3 ];

		array[ offset + 4 ] = te[ 4 ];
		array[ offset + 5 ] = te[ 5 ];
		array[ offset + 6 ] = te[ 6 ];
		array[ offset + 7 ] = te[ 7 ];

		array[ offset + 8 ] = te[ 8 ];
		array[ offset + 9 ] = te[ 9 ];
		array[ offset + 10 ] = te[ 10 ];
		array[ offset + 11 ] = te[ 11 ];

		array[ offset + 12 ] = te[ 12 ];
		array[ offset + 13 ] = te[ 13 ];
		array[ offset + 14 ] = te[ 14 ];
		array[ offset + 15 ] = te[ 15 ];

		return array;

	}

}

const _v1$5 = /*@__PURE__*/ new Vector3();
const _m1$2 = /*@__PURE__*/ new Matrix4();
const _zero = /*@__PURE__*/ new Vector3( 0, 0, 0 );
const _one = /*@__PURE__*/ new Vector3( 1, 1, 1 );
const _x = /*@__PURE__*/ new Vector3();
const _y = /*@__PURE__*/ new Vector3();
const _z = /*@__PURE__*/ new Vector3();

const _matrix$2 = /*@__PURE__*/ new Matrix4();
const _quaternion$3 = /*@__PURE__*/ new Quaternion();

/**
 * A class representing Euler angles.
 *
 * Euler angles describe a rotational transformation by rotating an object on
 * its various axes in specified amounts per axis, and a specified axis
 * order.
 *
 * Iterating through an instance will yield its components (x, y, z,
 * order) in the corresponding order.
 *
 * ```js
 * const a = new THREE.Euler( 0, 1, 1.57, 'XYZ' );
 * const b = new THREE.Vector3( 1, 0, 1 );
 * b.applyEuler(a);
 * ```
 */
class Euler {

	/**
	 * Constructs a new euler instance.
	 *
	 * @param {number} [x=0] - The angle of the x axis in radians.
	 * @param {number} [y=0] - The angle of the y axis in radians.
	 * @param {number} [z=0] - The angle of the z axis in radians.
	 * @param {string} [order=Euler.DEFAULT_ORDER] - A string representing the order that the rotations are applied.
	 */
	constructor( x = 0, y = 0, z = 0, order = Euler.DEFAULT_ORDER ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isEuler = true;

		this._x = x;
		this._y = y;
		this._z = z;
		this._order = order;

	}

	/**
	 * The angle of the x axis in radians.
	 *
	 * @type {number}
	 * @default 0
	 */
	get x() {

		return this._x;

	}

	set x( value ) {

		this._x = value;
		this._onChangeCallback();

	}

	/**
	 * The angle of the y axis in radians.
	 *
	 * @type {number}
	 * @default 0
	 */
	get y() {

		return this._y;

	}

	set y( value ) {

		this._y = value;
		this._onChangeCallback();

	}

	/**
	 * The angle of the z axis in radians.
	 *
	 * @type {number}
	 * @default 0
	 */
	get z() {

		return this._z;

	}

	set z( value ) {

		this._z = value;
		this._onChangeCallback();

	}

	/**
	 * A string representing the order that the rotations are applied.
	 *
	 * @type {string}
	 * @default 'XYZ'
	 */
	get order() {

		return this._order;

	}

	set order( value ) {

		this._order = value;
		this._onChangeCallback();

	}

	/**
	 * Sets the Euler components.
	 *
	 * @param {number} x - The angle of the x axis in radians.
	 * @param {number} y - The angle of the y axis in radians.
	 * @param {number} z - The angle of the z axis in radians.
	 * @param {string} [order] - A string representing the order that the rotations are applied.
	 * @return {Euler} A reference to this Euler instance.
	 */
	set( x, y, z, order = this._order ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._order = order;

		this._onChangeCallback();

		return this;

	}

	/**
	 * Returns a new Euler instance with copied values from this instance.
	 *
	 * @return {Euler} A clone of this instance.
	 */
	clone() {

		return new this.constructor( this._x, this._y, this._z, this._order );

	}

	/**
	 * Copies the values of the given Euler instance to this instance.
	 *
	 * @param {Euler} euler - The Euler instance to copy.
	 * @return {Euler} A reference to this Euler instance.
	 */
	copy( euler ) {

		this._x = euler._x;
		this._y = euler._y;
		this._z = euler._z;
		this._order = euler._order;

		this._onChangeCallback();

		return this;

	}

	/**
	 * Sets the angles of this Euler instance from a pure rotation matrix.
	 *
	 * @param {Matrix4} m - A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
	 * @param {string} [order] - A string representing the order that the rotations are applied.
	 * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
	 * @return {Euler} A reference to this Euler instance.
	 */
	setFromRotationMatrix( m, order = this._order, update = true ) {

		const te = m.elements;
		const m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ];
		const m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ];
		const m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ];

		switch ( order ) {

			case 'XYZ':

				this._y = Math.asin( clamp( m13, -1, 1 ) );

				if ( Math.abs( m13 ) < 0.9999999 ) {

					this._x = Math.atan2( - m23, m33 );
					this._z = Math.atan2( - m12, m11 );

				} else {

					this._x = Math.atan2( m32, m22 );
					this._z = 0;

				}

				break;

			case 'YXZ':

				this._x = Math.asin( - clamp( m23, -1, 1 ) );

				if ( Math.abs( m23 ) < 0.9999999 ) {

					this._y = Math.atan2( m13, m33 );
					this._z = Math.atan2( m21, m22 );

				} else {

					this._y = Math.atan2( - m31, m11 );
					this._z = 0;

				}

				break;

			case 'ZXY':

				this._x = Math.asin( clamp( m32, -1, 1 ) );

				if ( Math.abs( m32 ) < 0.9999999 ) {

					this._y = Math.atan2( - m31, m33 );
					this._z = Math.atan2( - m12, m22 );

				} else {

					this._y = 0;
					this._z = Math.atan2( m21, m11 );

				}

				break;

			case 'ZYX':

				this._y = Math.asin( - clamp( m31, -1, 1 ) );

				if ( Math.abs( m31 ) < 0.9999999 ) {

					this._x = Math.atan2( m32, m33 );
					this._z = Math.atan2( m21, m11 );

				} else {

					this._x = 0;
					this._z = Math.atan2( - m12, m22 );

				}

				break;

			case 'YZX':

				this._z = Math.asin( clamp( m21, -1, 1 ) );

				if ( Math.abs( m21 ) < 0.9999999 ) {

					this._x = Math.atan2( - m23, m22 );
					this._y = Math.atan2( - m31, m11 );

				} else {

					this._x = 0;
					this._y = Math.atan2( m13, m33 );

				}

				break;

			case 'XZY':

				this._z = Math.asin( - clamp( m12, -1, 1 ) );

				if ( Math.abs( m12 ) < 0.9999999 ) {

					this._x = Math.atan2( m32, m22 );
					this._y = Math.atan2( m13, m11 );

				} else {

					this._x = Math.atan2( - m23, m33 );
					this._y = 0;

				}

				break;

			default:

				console.warn( 'THREE.Euler: .setFromRotationMatrix() encountered an unknown order: ' + order );

		}

		this._order = order;

		if ( update === true ) this._onChangeCallback();

		return this;

	}

	/**
	 * Sets the angles of this Euler instance from a normalized quaternion.
	 *
	 * @param {Quaternion} q - A normalized Quaternion.
	 * @param {string} [order] - A string representing the order that the rotations are applied.
	 * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
	 * @return {Euler} A reference to this Euler instance.
	 */
	setFromQuaternion( q, order, update ) {

		_matrix$2.makeRotationFromQuaternion( q );

		return this.setFromRotationMatrix( _matrix$2, order, update );

	}

	/**
	 * Sets the angles of this Euler instance from the given vector.
	 *
	 * @param {Vector3} v - The vector.
	 * @param {string} [order] - A string representing the order that the rotations are applied.
	 * @return {Euler} A reference to this Euler instance.
	 */
	setFromVector3( v, order = this._order ) {

		return this.set( v.x, v.y, v.z, order );

	}

	/**
	 * Resets the euler angle with a new order by creating a quaternion from this
	 * euler angle and then setting this euler angle with the quaternion and the
	 * new order.
	 *
	 * Warning: This discards revolution information.
	 *
	 * @param {string} [newOrder] - A string representing the new order that the rotations are applied.
	 * @return {Euler} A reference to this Euler instance.
	 */
	reorder( newOrder ) {

		_quaternion$3.setFromEuler( this );

		return this.setFromQuaternion( _quaternion$3, newOrder );

	}

	/**
	 * Returns `true` if this Euler instance is equal with the given one.
	 *
	 * @param {Euler} euler - The Euler instance to test for equality.
	 * @return {boolean} Whether this Euler instance is equal with the given one.
	 */
	equals( euler ) {

		return ( euler._x === this._x ) && ( euler._y === this._y ) && ( euler._z === this._z ) && ( euler._order === this._order );

	}

	/**
	 * Sets this Euler instance's components to values from the given array. The first three
	 * entries of the array are assign to the x,y and z components. An optional fourth entry
	 * defines the Euler order.
	 *
	 * @param {Array<number,number,number,?string>} array - An array holding the Euler component values.
	 * @return {Euler} A reference to this Euler instance.
	 */
	fromArray( array ) {

		this._x = array[ 0 ];
		this._y = array[ 1 ];
		this._z = array[ 2 ];
		if ( array[ 3 ] !== undefined ) this._order = array[ 3 ];

		this._onChangeCallback();

		return this;

	}

	/**
	 * Writes the components of this Euler instance to the given array. If no array is provided,
	 * the method returns a new instance.
	 *
	 * @param {Array<number,number,number,string>} [array=[]] - The target array holding the Euler components.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Array<number,number,number,string>} The Euler components.
	 */
	toArray( array = [], offset = 0 ) {

		array[ offset ] = this._x;
		array[ offset + 1 ] = this._y;
		array[ offset + 2 ] = this._z;
		array[ offset + 3 ] = this._order;

		return array;

	}

	_onChange( callback ) {

		this._onChangeCallback = callback;

		return this;

	}

	_onChangeCallback() {}

	*[ Symbol.iterator ]() {

		yield this._x;
		yield this._y;
		yield this._z;
		yield this._order;

	}

}

/**
 * The default Euler angle order.
 *
 * @static
 * @type {string}
 * @default 'XYZ'
 */
Euler.DEFAULT_ORDER = 'XYZ';

/**
 * A layers object assigns an 3D object to 1 or more of 32
 * layers numbered `0` to `31` - internally the layers are stored as a
 * bit mask], and by default all 3D objects are a member of layer `0`.
 *
 * This can be used to control visibility - an object must share a layer with
 * a camera to be visible when that camera's view is
 * rendered.
 *
 * All classes that inherit from {@link Object3D} have an `layers` property which
 * is an instance of this class.
 */
class Layers {

	/**
	 * Constructs a new layers instance, with membership
	 * initially set to layer `0`.
	 */
	constructor() {

		/**
		 * A bit mask storing which of the 32 layers this layers object is currently
		 * a member of.
		 *
		 * @type {number}
		 */
		this.mask = 1 | 0;

	}

	/**
	 * Sets membership to the given layer, and remove membership all other layers.
	 *
	 * @param {number} layer - The layer to set.
	 */
	set( layer ) {

		this.mask = ( 1 << layer | 0 ) >>> 0;

	}

	/**
	 * Adds membership of the given layer.
	 *
	 * @param {number} layer - The layer to enable.
	 */
	enable( layer ) {

		this.mask |= 1 << layer | 0;

	}

	/**
	 * Adds membership to all layers.
	 */
	enableAll() {

		this.mask = 0xffffffff | 0;

	}

	/**
	 * Toggles the membership of the given layer.
	 *
	 * @param {number} layer - The layer to toggle.
	 */
	toggle( layer ) {

		this.mask ^= 1 << layer | 0;

	}

	/**
	 * Removes membership of the given layer.
	 *
	 * @param {number} layer - The layer to enable.
	 */
	disable( layer ) {

		this.mask &= ~ ( 1 << layer | 0 );

	}

	/**
	 * Removes the membership from all layers.
	 */
	disableAll() {

		this.mask = 0;

	}

	/**
	 * Returns `true` if this and the given layers object have at least one
	 * layer in common.
	 *
	 * @param {Layers} layers - The layers to test.
	 * @return {boolean } Whether this and the given layers object have at least one layer in common or not.
	 */
	test( layers ) {

		return ( this.mask & layers.mask ) !== 0;

	}

	/**
	 * Returns `true` if the given layer is enabled.
	 *
	 * @param {number} layer - The layer to test.
	 * @return {boolean } Whether the given layer is enabled or not.
	 */
	isEnabled( layer ) {

		return ( this.mask & ( 1 << layer | 0 ) ) !== 0;

	}

}

let _object3DId = 0;

const _v1$4 = /*@__PURE__*/ new Vector3();
const _q1 = /*@__PURE__*/ new Quaternion();
const _m1$1 = /*@__PURE__*/ new Matrix4();
const _target = /*@__PURE__*/ new Vector3();

const _position$3 = /*@__PURE__*/ new Vector3();
const _scale$2 = /*@__PURE__*/ new Vector3();
const _quaternion$2 = /*@__PURE__*/ new Quaternion();

const _xAxis = /*@__PURE__*/ new Vector3( 1, 0, 0 );
const _yAxis = /*@__PURE__*/ new Vector3( 0, 1, 0 );
const _zAxis = /*@__PURE__*/ new Vector3( 0, 0, 1 );

/**
 * Fires when the object has been added to its parent object.
 *
 * @event Object3D#added
 * @type {Object}
 */
const _addedEvent = { type: 'added' };

/**
 * Fires when the object has been removed from its parent object.
 *
 * @event Object3D#removed
 * @type {Object}
 */
const _removedEvent = { type: 'removed' };

/**
 * Fires when a new child object has been added.
 *
 * @event Object3D#childadded
 * @type {Object}
 */
const _childaddedEvent = { type: 'childadded', child: null };

/**
 * Fires when a child object has been removed.
 *
 * @event Object3D#childremoved
 * @type {Object}
 */
const _childremovedEvent = { type: 'childremoved', child: null };

/**
 * This is the base class for most objects in three.js and provides a set of
 * properties and methods for manipulating objects in 3D space.
 *
 * @augments EventDispatcher
 */
class Object3D extends EventDispatcher {

	/**
	 * Constructs a new 3D object.
	 */
	constructor() {

		super();

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isObject3D = true;

		/**
		 * The ID of the 3D object.
		 *
		 * @name Object3D#id
		 * @type {number}
		 * @readonly
		 */
		Object.defineProperty( this, 'id', { value: _object3DId ++ } );

		/**
		 * The UUID of the 3D object.
		 *
		 * @type {string}
		 * @readonly
		 */
		this.uuid = generateUUID();

		/**
		 * The name of the 3D object.
		 *
		 * @type {string}
		 */
		this.name = '';

		/**
		 * The type property is used for detecting the object type
		 * in context of serialization/deserialization.
		 *
		 * @type {string}
		 * @readonly
		 */
		this.type = 'Object3D';

		/**
		 * A reference to the parent object.
		 *
		 * @type {?Object3D}
		 * @default null
		 */
		this.parent = null;

		/**
		 * An array holding the child 3D objects of this instance.
		 *
		 * @type {Array<Object3D>}
		 */
		this.children = [];

		/**
		 * Defines the `up` direction of the 3D object which influences
		 * the orientation via methods like {@link Object3D#lookAt}.
		 *
		 * The default values for all 3D objects is defined by `Object3D.DEFAULT_UP`.
		 *
		 * @type {Vector3}
		 */
		this.up = Object3D.DEFAULT_UP.clone();

		const position = new Vector3();
		const rotation = new Euler();
		const quaternion = new Quaternion();
		const scale = new Vector3( 1, 1, 1 );

		function onRotationChange() {

			quaternion.setFromEuler( rotation, false );

		}

		function onQuaternionChange() {

			rotation.setFromQuaternion( quaternion, undefined, false );

		}

		rotation._onChange( onRotationChange );
		quaternion._onChange( onQuaternionChange );

		Object.defineProperties( this, {
			/**
			 * Represents the object's local position.
			 *
			 * @name Object3D#position
			 * @type {Vector3}
			 * @default (0,0,0)
			 */
			position: {
				configurable: true,
				enumerable: true,
				value: position
			},
			/**
			 * Represents the object's local rotation as Euler angles, in radians.
			 *
			 * @name Object3D#rotation
			 * @type {Euler}
			 * @default (0,0,0)
			 */
			rotation: {
				configurable: true,
				enumerable: true,
				value: rotation
			},
			/**
			 * Represents the object's local rotation as Quaternions.
			 *
			 * @name Object3D#quaternion
			 * @type {Quaternion}
			 */
			quaternion: {
				configurable: true,
				enumerable: true,
				value: quaternion
			},
			/**
			 * Represents the object's local scale.
			 *
			 * @name Object3D#scale
			 * @type {Vector3}
			 * @default (1,1,1)
			 */
			scale: {
				configurable: true,
				enumerable: true,
				value: scale
			},
			/**
			 * Represents the object's model-view matrix.
			 *
			 * @name Object3D#modelViewMatrix
			 * @type {Matrix4}
			 */
			modelViewMatrix: {
				value: new Matrix4()
			},
			/**
			 * Represents the object's normal matrix.
			 *
			 * @name Object3D#normalMatrix
			 * @type {Matrix3}
			 */
			normalMatrix: {
				value: new Matrix3()
			}
		} );

		/**
		 * Represents the object's transformation matrix in local space.
		 *
		 * @type {Matrix4}
		 */
		this.matrix = new Matrix4();

		/**
		 * Represents the object's transformation matrix in world space.
		 * If the 3D object has no parent, then it's identical to the local transformation matrix
		 *
		 * @type {Matrix4}
		 */
		this.matrixWorld = new Matrix4();

		/**
		 * When set to `true`, the engine automatically computes the local matrix from position,
		 * rotation and scale every frame.
		 *
		 * The default values for all 3D objects is defined by `Object3D.DEFAULT_MATRIX_AUTO_UPDATE`.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.matrixAutoUpdate = Object3D.DEFAULT_MATRIX_AUTO_UPDATE;

		/**
		 * When set to `true`, the engine automatically computes the world matrix from the current local
		 * matrix and the object's transformation hierarchy.
		 *
		 * The default values for all 3D objects is defined by `Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE`.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.matrixWorldAutoUpdate = Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE; // checked by the renderer

		/**
		 * When set to `true`, it calculates the world matrix in that frame and resets this property
		 * to `false`.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.matrixWorldNeedsUpdate = false;

		/**
		 * The layer membership of the 3D object. The 3D object is only visible if it has
		 * at least one layer in common with the camera in use. This property can also be
		 * used to filter out unwanted objects in ray-intersection tests when using {@link Raycaster}.
		 *
		 * @type {Layers}
		 */
		this.layers = new Layers();

		/**
		 * When set to `true`, the 3D object gets rendered.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.visible = true;

		/**
		 * When set to `true`, the 3D object gets rendered into shadow maps.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.castShadow = false;

		/**
		 * When set to `true`, the 3D object is affected by shadows in the scene.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.receiveShadow = false;

		/**
		 * When set to `true`, the 3D object is honored by view frustum culling.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.frustumCulled = true;

		/**
		 * This value allows the default rendering order of scene graph objects to be
		 * overridden although opaque and transparent objects remain sorted independently.
		 * When this property is set for an instance of {@link Group},all descendants
		 * objects will be sorted and rendered together. Sorting is from lowest to highest
		 * render order.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.renderOrder = 0;

		/**
		 * An array holding the animation clips of the 3D object.
		 *
		 * @type {Array<AnimationClip>}
		 */
		this.animations = [];

		/**
		 * Custom depth material to be used when rendering to the depth map. Can only be used
		 * in context of meshes. When shadow-casting with a {@link DirectionalLight} or {@link SpotLight},
		 * if you are modifying vertex positions in the vertex shader you must specify a custom depth
		 * material for proper shadows.
		 *
		 * Only relevant in context of {@link WebGLRenderer}.
		 *
		 * @type {(Material|undefined)}
		 * @default undefined
		 */
		this.customDepthMaterial = undefined;

		/**
		 * Same as {@link Object3D#customDepthMaterial}, but used with {@link PointLight}.
		 *
		 * Only relevant in context of {@link WebGLRenderer}.
		 *
		 * @type {(Material|undefined)}
		 * @default undefined
		 */
		this.customDistanceMaterial = undefined;

		/**
		 * An object that can be used to store custom data about the 3D object. It
		 * should not hold references to functions as these will not be cloned.
		 *
		 * @type {Object}
		 */
		this.userData = {};

	}

	/**
	 * A callback that is executed immediately before a 3D object is rendered to a shadow map.
	 *
	 * @param {Renderer|WebGLRenderer} renderer - The renderer.
	 * @param {Object3D} object - The 3D object.
	 * @param {Camera} camera - The camera that is used to render the scene.
	 * @param {Camera} shadowCamera - The shadow camera.
	 * @param {BufferGeometry} geometry - The 3D object's geometry.
	 * @param {Material} depthMaterial - The depth material.
	 * @param {Object} group - The geometry group data.
	 */
	onBeforeShadow( /* renderer, object, camera, shadowCamera, geometry, depthMaterial, group */ ) {}

	/**
	 * A callback that is executed immediately after a 3D object is rendered to a shadow map.
	 *
	 * @param {Renderer|WebGLRenderer} renderer - The renderer.
	 * @param {Object3D} object - The 3D object.
	 * @param {Camera} camera - The camera that is used to render the scene.
	 * @param {Camera} shadowCamera - The shadow camera.
	 * @param {BufferGeometry} geometry - The 3D object's geometry.
	 * @param {Material} depthMaterial - The depth material.
	 * @param {Object} group - The geometry group data.
	 */
	onAfterShadow( /* renderer, object, camera, shadowCamera, geometry, depthMaterial, group */ ) {}

	/**
	 * A callback that is executed immediately before a 3D object is rendered.
	 *
	 * @param {Renderer|WebGLRenderer} renderer - The renderer.
	 * @param {Object3D} object - The 3D object.
	 * @param {Camera} camera - The camera that is used to render the scene.
	 * @param {BufferGeometry} geometry - The 3D object's geometry.
	 * @param {Material} material - The 3D object's material.
	 * @param {Object} group - The geometry group data.
	 */
	onBeforeRender( /* renderer, scene, camera, geometry, material, group */ ) {}

	/**
	 * A callback that is executed immediately after a 3D object is rendered.
	 *
	 * @param {Renderer|WebGLRenderer} renderer - The renderer.
	 * @param {Object3D} object - The 3D object.
	 * @param {Camera} camera - The camera that is used to render the scene.
	 * @param {BufferGeometry} geometry - The 3D object's geometry.
	 * @param {Material} material - The 3D object's material.
	 * @param {Object} group - The geometry group data.
	 */
	onAfterRender( /* renderer, scene, camera, geometry, material, group */ ) {}

	/**
	 * Applies the given transformation matrix to the object and updates the object's position,
	 * rotation and scale.
	 *
	 * @param {Matrix4} matrix - The transformation matrix.
	 */
	applyMatrix4( matrix ) {

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		this.matrix.premultiply( matrix );

		this.matrix.decompose( this.position, this.quaternion, this.scale );

	}

	/**
	 * Applies a rotation represented by given the quaternion to the 3D object.
	 *
	 * @param {Quaternion} q - The quaternion.
	 * @return {Object3D} A reference to this instance.
	 */
	applyQuaternion( q ) {

		this.quaternion.premultiply( q );

		return this;

	}

	/**
	 * Sets the given rotation represented as an axis/angle couple to the 3D object.
	 *
	 * @param {Vector3} axis - The (normalized) axis vector.
	 * @param {number} angle - The angle in radians.
	 */
	setRotationFromAxisAngle( axis, angle ) {

		// assumes axis is normalized

		this.quaternion.setFromAxisAngle( axis, angle );

	}

	/**
	 * Sets the given rotation represented as Euler angles to the 3D object.
	 *
	 * @param {Euler} euler - The Euler angles.
	 */
	setRotationFromEuler( euler ) {

		this.quaternion.setFromEuler( euler, true );

	}

	/**
	 * Sets the given rotation represented as rotation matrix to the 3D object.
	 *
	 * @param {Matrix4} m - Although a 4x4 matrix is expected, the upper 3x3 portion must be
	 * a pure rotation matrix (i.e, unscaled).
	 */
	setRotationFromMatrix( m ) {

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		this.quaternion.setFromRotationMatrix( m );

	}

	/**
	 * Sets the given rotation represented as a Quaternion to the 3D object.
	 *
	 * @param {Quaternion} q - The Quaternion
	 */
	setRotationFromQuaternion( q ) {

		// assumes q is normalized

		this.quaternion.copy( q );

	}

	/**
	 * Rotates the 3D object along an axis in local space.
	 *
	 * @param {Vector3} axis - The (normalized) axis vector.
	 * @param {number} angle - The angle in radians.
	 * @return {Object3D} A reference to this instance.
	 */
	rotateOnAxis( axis, angle ) {

		// rotate object on axis in object space
		// axis is assumed to be normalized

		_q1.setFromAxisAngle( axis, angle );

		this.quaternion.multiply( _q1 );

		return this;

	}

	/**
	 * Rotates the 3D object along an axis in world space.
	 *
	 * @param {Vector3} axis - The (normalized) axis vector.
	 * @param {number} angle - The angle in radians.
	 * @return {Object3D} A reference to this instance.
	 */
	rotateOnWorldAxis( axis, angle ) {

		// rotate object on axis in world space
		// axis is assumed to be normalized
		// method assumes no rotated parent

		_q1.setFromAxisAngle( axis, angle );

		this.quaternion.premultiply( _q1 );

		return this;

	}

	/**
	 * Rotates the 3D object around its X axis in local space.
	 *
	 * @param {number} angle - The angle in radians.
	 * @return {Object3D} A reference to this instance.
	 */
	rotateX( angle ) {

		return this.rotateOnAxis( _xAxis, angle );

	}

	/**
	 * Rotates the 3D object around its Y axis in local space.
	 *
	 * @param {number} angle - The angle in radians.
	 * @return {Object3D} A reference to this instance.
	 */
	rotateY( angle ) {

		return this.rotateOnAxis( _yAxis, angle );

	}

	/**
	 * Rotates the 3D object around its Z axis in local space.
	 *
	 * @param {number} angle - The angle in radians.
	 * @return {Object3D} A reference to this instance.
	 */
	rotateZ( angle ) {

		return this.rotateOnAxis( _zAxis, angle );

	}

	/**
	 * Translate the 3D object by a distance along the given axis in local space.
	 *
	 * @param {Vector3} axis - The (normalized) axis vector.
	 * @param {number} distance - The distance in world units.
	 * @return {Object3D} A reference to this instance.
	 */
	translateOnAxis( axis, distance ) {

		// translate object by distance along axis in object space
		// axis is assumed to be normalized

		_v1$4.copy( axis ).applyQuaternion( this.quaternion );

		this.position.add( _v1$4.multiplyScalar( distance ) );

		return this;

	}

	/**
	 * Translate the 3D object by a distance along its X-axis in local space.
	 *
	 * @param {number} distance - The distance in world units.
	 * @return {Object3D} A reference to this instance.
	 */
	translateX( distance ) {

		return this.translateOnAxis( _xAxis, distance );

	}

	/**
	 * Translate the 3D object by a distance along its Y-axis in local space.
	 *
	 * @param {number} distance - The distance in world units.
	 * @return {Object3D} A reference to this instance.
	 */
	translateY( distance ) {

		return this.translateOnAxis( _yAxis, distance );

	}

	/**
	 * Translate the 3D object by a distance along its Z-axis in local space.
	 *
	 * @param {number} distance - The distance in world units.
	 * @return {Object3D} A reference to this instance.
	 */
	translateZ( distance ) {

		return this.translateOnAxis( _zAxis, distance );

	}

	/**
	 * Converts the given vector from this 3D object's local space to world space.
	 *
	 * @param {Vector3} vector - The vector to convert.
	 * @return {Vector3} The converted vector.
	 */
	localToWorld( vector ) {

		this.updateWorldMatrix( true, false );

		return vector.applyMatrix4( this.matrixWorld );

	}

	/**
	 * Converts the given vector from this 3D object's word space to local space.
	 *
	 * @param {Vector3} vector - The vector to convert.
	 * @return {Vector3} The converted vector.
	 */
	worldToLocal( vector ) {

		this.updateWorldMatrix( true, false );

		return vector.applyMatrix4( _m1$1.copy( this.matrixWorld ).invert() );

	}

	/**
	 * Rotates the object to face a point in world space.
	 *
	 * This method does not support objects having non-uniformly-scaled parent(s).
	 *
	 * @param {number|Vector3} x - The x coordinate in world space. Alternatively, a vector representing a position in world space
	 * @param {number} [y] - The y coordinate in world space.
	 * @param {number} [z] - The z coordinate in world space.
	 */
	lookAt( x, y, z ) {

		// This method does not support objects having non-uniformly-scaled parent(s)

		if ( x.isVector3 ) {

			_target.copy( x );

		} else {

			_target.set( x, y, z );

		}

		const parent = this.parent;

		this.updateWorldMatrix( true, false );

		_position$3.setFromMatrixPosition( this.matrixWorld );

		if ( this.isCamera || this.isLight ) {

			_m1$1.lookAt( _position$3, _target, this.up );

		} else {

			_m1$1.lookAt( _target, _position$3, this.up );

		}

		this.quaternion.setFromRotationMatrix( _m1$1 );

		if ( parent ) {

			_m1$1.extractRotation( parent.matrixWorld );
			_q1.setFromRotationMatrix( _m1$1 );
			this.quaternion.premultiply( _q1.invert() );

		}

	}

	/**
	 * Adds the given 3D object as a child to this 3D object. An arbitrary number of
	 * objects may be added. Any current parent on an object passed in here will be
	 * removed, since an object can have at most one parent.
	 *
	 * @fires Object3D#added
	 * @fires Object3D#childadded
	 * @param {Object3D} object - The 3D object to add.
	 * @return {Object3D} A reference to this instance.
	 */
	add( object ) {

		if ( arguments.length > 1 ) {

			for ( let i = 0; i < arguments.length; i ++ ) {

				this.add( arguments[ i ] );

			}

			return this;

		}

		if ( object === this ) {

			console.error( 'THREE.Object3D.add: object can\'t be added as a child of itself.', object );
			return this;

		}

		if ( object && object.isObject3D ) {

			object.removeFromParent();
			object.parent = this;
			this.children.push( object );

			object.dispatchEvent( _addedEvent );

			_childaddedEvent.child = object;
			this.dispatchEvent( _childaddedEvent );
			_childaddedEvent.child = null;

		} else {

			console.error( 'THREE.Object3D.add: object not an instance of THREE.Object3D.', object );

		}

		return this;

	}

	/**
	 * Removes the given 3D object as child from this 3D object.
	 * An arbitrary number of objects may be removed.
	 *
	 * @fires Object3D#removed
	 * @fires Object3D#childremoved
	 * @param {Object3D} object - The 3D object to remove.
	 * @return {Object3D} A reference to this instance.
	 */
	remove( object ) {

		if ( arguments.length > 1 ) {

			for ( let i = 0; i < arguments.length; i ++ ) {

				this.remove( arguments[ i ] );

			}

			return this;

		}

		const index = this.children.indexOf( object );

		if ( index !== -1 ) {

			object.parent = null;
			this.children.splice( index, 1 );

			object.dispatchEvent( _removedEvent );

			_childremovedEvent.child = object;
			this.dispatchEvent( _childremovedEvent );
			_childremovedEvent.child = null;

		}

		return this;

	}

	/**
	 * Removes this 3D object from its current parent.
	 *
	 *…102152 tokens truncated…			camera.far = far;
			camera.updateProjectionMatrix();

		}

		super.updateMatrices( light );

	}

	copy( source ) {

		super.copy( source );

		this.focus = source.focus;

		return this;

	}

}

/**
 * This light gets emitted from a single point in one direction, along a cone
 * that increases in size the further from the light it gets.
 *
 * This light can cast shadows - see the {@link SpotLightShadow} for details.
 *
 * ```js
 * // white spotlight shining from the side, modulated by a texture
 * const spotLight = new THREE.SpotLight( 0xffffff );
 * spotLight.position.set( 100, 1000, 100 );
 * spotLight.map = new THREE.TextureLoader().load( url );
 *
 * spotLight.castShadow = true;
 * spotLight.shadow.mapSize.width = 1024;
 * spotLight.shadow.mapSize.height = 1024;
 * spotLight.shadow.camera.near = 500;
 * spotLight.shadow.camera.far = 4000;
 * spotLight.shadow.camera.fov = 30;s
 * ```
 *
 * @augments Light
 */
class SpotLight extends Light {

	/**
	 * Constructs a new spot light.
	 *
	 * @param {(number|Color|string)} [color=0xffffff] - The light's color.
	 * @param {number} [intensity=1] - The light's strength/intensity measured in candela (cd).
	 * @param {number} [distance=0] - Maximum range of the light. `0` means no limit.
	 * @param {number} [angle=Math.PI/3] - Maximum angle of light dispersion from its direction whose upper bound is `Math.PI/2`.
	 * @param {number} [penumbra=0] - Percent of the spotlight cone that is attenuated due to penumbra. Value range is `[0,1]`.
	 * @param {number} [decay=2] - The amount the light dims along the distance of the light.
	 */
	constructor( color, intensity, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 2 ) {

		super( color, intensity );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isSpotLight = true;

		this.type = 'SpotLight';

		this.position.copy( Object3D.DEFAULT_UP );
		this.updateMatrix();

		/**
		 * The spot light points from its position to the
		 * target's position.
		 *
		 * For the target's position to be changed to anything other
		 * than the default, it must be added to the scene.
		 *
		 * It is also possible to set the target to be another 3D object
		 * in the scene. The light will now track the target object.
		 *
		 * @type {Object3D}
		 */
		this.target = new Object3D();

		/**
		 * Maximum range of the light. `0` means no limit.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.distance = distance;

		/**
		 * Maximum angle of light dispersion from its direction whose upper bound is `Math.PI/2`.
		 *
		 * @type {number}
		 * @default Math.PI/3
		 */
		this.angle = angle;

		/**
		 * Percent of the spotlight cone that is attenuated due to penumbra.
		 * Value range is `[0,1]`.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.penumbra = penumbra;

		/**
		 * The amount the light dims along the distance of the light. In context of
		 * physically-correct rendering the default value should not be changed.
		 *
		 * @type {number}
		 * @default 2
		 */
		this.decay = decay;

		/**
		 * A texture used to modulate the color of the light. The spot light
		 * color is mixed with the RGB value of this texture, with a ratio
		 * corresponding to its alpha value. The cookie-like masking effect is
		 * reproduced using pixel values (0, 0, 0, 1-cookie_value).
		 *
		 * *Warning*: This property is disabled if {@link Object3D#castShadow} is set to `false`.
		 *
		 * @type {?Texture}
		 * @default null
		 */
		this.map = null;

		/**
		 * This property holds the light's shadow configuration.
		 *
		 * @type {SpotLightShadow}
		 */
		this.shadow = new SpotLightShadow();

	}

	/**
	 * The light's power. Power is the luminous power of the light measured in lumens (lm).
	 *  Changing the power will also change the light's intensity.
	 *
	 * @type {number}
	 */
	get power() {

		// compute the light's luminous power (in lumens) from its intensity (in candela)
		// by convention for a spotlight, luminous power (lm) = π * luminous intensity (cd)
		return this.intensity * Math.PI;

	}

	set power( power ) {

		// set the light's intensity (in candela) from the desired luminous power (in lumens)
		this.intensity = power / Math.PI;

	}

	dispose() {

		this.shadow.dispose();

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.distance = source.distance;
		this.angle = source.angle;
		this.penumbra = source.penumbra;
		this.decay = source.decay;

		this.target = source.target.clone();

		this.shadow = source.shadow.clone();

		return this;

	}

}

const _projScreenMatrix = /*@__PURE__*/ new Matrix4();
const _lightPositionWorld = /*@__PURE__*/ new Vector3();
const _lookTarget = /*@__PURE__*/ new Vector3();

/**
 * Represents the shadow configuration of point lights.
 *
 * @augments LightShadow
 */
class PointLightShadow extends LightShadow {

	/**
	 * Constructs a new point light shadow.
	 */
	constructor() {

		super( new PerspectiveCamera( 90, 1, 0.5, 500 ) );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isPointLightShadow = true;

		this._frameExtents = new Vector2( 4, 2 );

		this._viewportCount = 6;

		this._viewports = [
			// These viewports map a cube-map onto a 2D texture with the
			// following orientation:
			//
			//  xzXZ
			//   y Y
			//
			// X - Positive x direction
			// x - Negative x direction
			// Y - Positive y direction
			// y - Negative y direction
			// Z - Positive z direction
			// z - Negative z direction

			// positive X
			new Vector4( 2, 1, 1, 1 ),
			// negative X
			new Vector4( 0, 1, 1, 1 ),
			// positive Z
			new Vector4( 3, 1, 1, 1 ),
			// negative Z
			new Vector4( 1, 1, 1, 1 ),
			// positive Y
			new Vector4( 3, 0, 1, 1 ),
			// negative Y
			new Vector4( 1, 0, 1, 1 )
		];

		this._cubeDirections = [
			new Vector3( 1, 0, 0 ), new Vector3( -1, 0, 0 ), new Vector3( 0, 0, 1 ),
			new Vector3( 0, 0, -1 ), new Vector3( 0, 1, 0 ), new Vector3( 0, -1, 0 )
		];

		this._cubeUps = [
			new Vector3( 0, 1, 0 ), new Vector3( 0, 1, 0 ), new Vector3( 0, 1, 0 ),
			new Vector3( 0, 1, 0 ), new Vector3( 0, 0, 1 ),	new Vector3( 0, 0, -1 )
		];

	}

	/**
	 * Update the matrices for the camera and shadow, used internally by the renderer.
	 *
	 * @param {Light} light - The light for which the shadow is being rendered.
	 * @param {number} [viewportIndex=0] - The viewport index.
	 */
	updateMatrices( light, viewportIndex = 0 ) {

		const camera = this.camera;
		const shadowMatrix = this.matrix;

		const far = light.distance || camera.far;

		if ( far !== camera.far ) {

			camera.far = far;
			camera.updateProjectionMatrix();

		}

		_lightPositionWorld.setFromMatrixPosition( light.matrixWorld );
		camera.position.copy( _lightPositionWorld );

		_lookTarget.copy( camera.position );
		_lookTarget.add( this._cubeDirections[ viewportIndex ] );
		camera.up.copy( this._cubeUps[ viewportIndex ] );
		camera.lookAt( _lookTarget );
		camera.updateMatrixWorld();

		shadowMatrix.makeTranslation( - _lightPositionWorld.x, - _lightPositionWorld.y, - _lightPositionWorld.z );

		_projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
		this._frustum.setFromProjectionMatrix( _projScreenMatrix, camera.coordinateSystem, camera.reversedDepth );

	}

}

/**
 * A light that gets emitted from a single point in all directions. A common
 * use case for this is to replicate the light emitted from a bare
 * lightbulb.
 *
 * This light can cast shadows - see the {@link PointLightShadow} for details.
 *
 * ```js
 * const light = new THREE.PointLight( 0xff0000, 1, 100 );
 * light.position.set( 50, 50, 50 );
 * scene.add( light );
 * ```
 *
 * @augments Light
 */
class PointLight extends Light {

	/**
	 * Constructs a new point light.
	 *
	 * @param {(number|Color|string)} [color=0xffffff] - The light's color.
	 * @param {number} [intensity=1] - The light's strength/intensity measured in candela (cd).
	 * @param {number} [distance=0] - Maximum range of the light. `0` means no limit.
	 * @param {number} [decay=2] - The amount the light dims along the distance of the light.
	 */
	constructor( color, intensity, distance = 0, decay = 2 ) {

		super( color, intensity );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isPointLight = true;

		this.type = 'PointLight';

		/**
		 * When distance is zero, light will attenuate according to inverse-square
		 * law to infinite distance. When distance is non-zero, light will attenuate
		 * according to inverse-square law until near the distance cutoff, where it
		 * will then attenuate quickly and smoothly to 0. Inherently, cutoffs are not
		 * physically correct.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.distance = distance;

		/**
		 * The amount the light dims along the distance of the light. In context of
		 * physically-correct rendering the default value should not be changed.
		 *
		 * @type {number}
		 * @default 2
		 */
		this.decay = decay;

		/**
		 * This property holds the light's shadow configuration.
		 *
		 * @type {PointLightShadow}
		 */
		this.shadow = new PointLightShadow();

	}

	/**
	 * The light's power. Power is the luminous power of the light measured in lumens (lm).
	 * Changing the power will also change the light's intensity.
	 *
	 * @type {number}
	 */
	get power() {

		// compute the light's luminous power (in lumens) from its intensity (in candela)
		// for an isotropic light source, luminous power (lm) = 4 π luminous intensity (cd)
		return this.intensity * 4 * Math.PI;

	}

	set power( power ) {

		// set the light's intensity (in candela) from the desired luminous power (in lumens)
		this.intensity = power / ( 4 * Math.PI );

	}

	dispose() {

		this.shadow.dispose();

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.distance = source.distance;
		this.decay = source.decay;

		this.shadow = source.shadow.clone();

		return this;

	}

}

/**
 * Camera that uses [orthographic projection]{@link https://en.wikipedia.org/wiki/Orthographic_projection}.
 *
 * In this projection mode, an object's size in the rendered image stays
 * constant regardless of its distance from the camera. This can be useful
 * for rendering 2D scenes and UI elements, amongst other things.
 *
 * ```js
 * const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );
 * scene.add( camera );
 * ```
 *
 * @augments Camera
 */
class OrthographicCamera extends Camera {

	/**
	 * Constructs a new orthographic camera.
	 *
	 * @param {number} [left=-1] - The left plane of the camera's frustum.
	 * @param {number} [right=1] - The right plane of the camera's frustum.
	 * @param {number} [top=1] - The top plane of the camera's frustum.
	 * @param {number} [bottom=-1] - The bottom plane of the camera's frustum.
	 * @param {number} [near=0.1] - The camera's near plane.
	 * @param {number} [far=2000] - The camera's far plane.
	 */
	constructor( left = -1, right = 1, top = 1, bottom = -1, near = 0.1, far = 2000 ) {

		super();

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isOrthographicCamera = true;

		this.type = 'OrthographicCamera';

		/**
		 * The zoom factor of the camera.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.zoom = 1;

		/**
		 * Represents the frustum window specification. This property should not be edited
		 * directly but via {@link PerspectiveCamera#setViewOffset} and {@link PerspectiveCamera#clearViewOffset}.
		 *
		 * @type {?Object}
		 * @default null
		 */
		this.view = null;

		/**
		 * The left plane of the camera's frustum.
		 *
		 * @type {number}
		 * @default -1
		 */
		this.left = left;

		/**
		 * The right plane of the camera's frustum.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.right = right;

		/**
		 * The top plane of the camera's frustum.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.top = top;

		/**
		 * The bottom plane of the camera's frustum.
		 *
		 * @type {number}
		 * @default -1
		 */
		this.bottom = bottom;

		/**
		 * The camera's near plane. The valid range is greater than `0`
		 * and less than the current value of {@link OrthographicCamera#far}.
		 *
		 * Note that, unlike for the {@link PerspectiveCamera}, `0` is a
		 * valid value for an orthographic camera's near plane.
		 *
		 * @type {number}
		 * @default 0.1
		 */
		this.near = near;

		/**
		 * The camera's far plane. Must be greater than the
		 * current value of {@link OrthographicCamera#near}.
		 *
		 * @type {number}
		 * @default 2000
		 */
		this.far = far;

		this.updateProjectionMatrix();

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.left = source.left;
		this.right = source.right;
		this.top = source.top;
		this.bottom = source.bottom;
		this.near = source.near;
		this.far = source.far;

		this.zoom = source.zoom;
		this.view = source.view === null ? null : Object.assign( {}, source.view );

		return this;

	}

	/**
	 * Sets an offset in a larger frustum. This is useful for multi-window or
	 * multi-monitor/multi-machine setups.
	 *
	 * @param {number} fullWidth - The full width of multiview setup.
	 * @param {number} fullHeight - The full height of multiview setup.
	 * @param {number} x - The horizontal offset of the subcamera.
	 * @param {number} y - The vertical offset of the subcamera.
	 * @param {number} width - The width of subcamera.
	 * @param {number} height - The height of subcamera.
	 * @see {@link PerspectiveCamera#setViewOffset}
	 */
	setViewOffset( fullWidth, fullHeight, x, y, width, height ) {

		if ( this.view === null ) {

			this.view = {
				enabled: true,
				fullWidth: 1,
				fullHeight: 1,
				offsetX: 0,
				offsetY: 0,
				width: 1,
				height: 1
			};

		}

		this.view.enabled = true;
		this.view.fullWidth = fullWidth;
		this.view.fullHeight = fullHeight;
		this.view.offsetX = x;
		this.view.offsetY = y;
		this.view.width = width;
		this.view.height = height;

		this.updateProjectionMatrix();

	}

	/**
	 * Removes the view offset from the projection matrix.
	 */
	clearViewOffset() {

		if ( this.view !== null ) {

			this.view.enabled = false;

		}

		this.updateProjectionMatrix();

	}

	/**
	 * Updates the camera's projection matrix. Must be called after any change of
	 * camera properties.
	 */
	updateProjectionMatrix() {

		const dx = ( this.right - this.left ) / ( 2 * this.zoom );
		const dy = ( this.top - this.bottom ) / ( 2 * this.zoom );
		const cx = ( this.right + this.left ) / 2;
		const cy = ( this.top + this.bottom ) / 2;

		let left = cx - dx;
		let right = cx + dx;
		let top = cy + dy;
		let bottom = cy - dy;

		if ( this.view !== null && this.view.enabled ) {

			const scaleW = ( this.right - this.left ) / this.view.fullWidth / this.zoom;
			const scaleH = ( this.top - this.bottom ) / this.view.fullHeight / this.zoom;

			left += scaleW * this.view.offsetX;
			right = left + scaleW * this.view.width;
			top -= scaleH * this.view.offsetY;
			bottom = top - scaleH * this.view.height;

		}

		this.projectionMatrix.makeOrthographic( left, right, top, bottom, this.near, this.far, this.coordinateSystem, this.reversedDepth );

		this.projectionMatrixInverse.copy( this.projectionMatrix ).invert();

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.object.zoom = this.zoom;
		data.object.left = this.left;
		data.object.right = this.right;
		data.object.top = this.top;
		data.object.bottom = this.bottom;
		data.object.near = this.near;
		data.object.far = this.far;

		if ( this.view !== null ) data.object.view = Object.assign( {}, this.view );

		return data;

	}

}

/**
 * Represents the shadow configuration of directional lights.
 *
 * @augments LightShadow
 */
class DirectionalLightShadow extends LightShadow {

	/**
	 * Constructs a new directional light shadow.
	 */
	constructor() {

		super( new OrthographicCamera( -5, 5, 5, -5, 0.5, 500 ) );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isDirectionalLightShadow = true;

	}

}

/**
 * A light that gets emitted in a specific direction. This light will behave
 * as though it is infinitely far away and the rays produced from it are all
 * parallel. The common use case for this is to simulate daylight; the sun is
 * far enough away that its position can be considered to be infinite, and
 * all light rays coming from it are parallel.
 *
 * A common point of confusion for directional lights is that setting the
 * rotation has no effect. This is because three.js's DirectionalLight is the
 * equivalent to what is often called a 'Target Direct Light' in other
 * applications.
 *
 * This means that its direction is calculated as pointing from the light's
 * {@link Object3D#position} to the {@link DirectionalLight#target} position
 * (as opposed to a 'Free Direct Light' that just has a rotation
 * component).
 *
 * This light can cast shadows - see the {@link DirectionalLightShadow} for details.
 *
 * ```js
 * // White directional light at half intensity shining from the top.
 * const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
 * scene.add( directionalLight );
 * ```
 *
 * @augments Light
 */
class DirectionalLight extends Light {

	/**
	 * Constructs a new directional light.
	 *
	 * @param {(number|Color|string)} [color=0xffffff] - The light's color.
	 * @param {number} [intensity=1] - The light's strength/intensity.
	 */
	constructor( color, intensity ) {

		super( color, intensity );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isDirectionalLight = true;

		this.type = 'DirectionalLight';

		this.position.copy( Object3D.DEFAULT_UP );
		this.updateMatrix();

		/**
		 * The directional light points from its position to the
		 * target's position.
		 *
		 * For the target's position to be changed to anything other
		 * than the default, it must be added to the scene.
		 *
		 * It is also possible to set the target to be another 3D object
		 * in the scene. The light will now track the target object.
		 *
		 * @type {Object3D}
		 */
		this.target = new Object3D();

		/**
		 * This property holds the light's shadow configuration.
		 *
		 * @type {DirectionalLightShadow}
		 */
		this.shadow = new DirectionalLightShadow();

	}

	dispose() {

		this.shadow.dispose();

	}

	copy( source ) {

		super.copy( source );

		this.target = source.target.clone();
		this.shadow = source.shadow.clone();

		return this;

	}

}

/**
 * This light globally illuminates all objects in the scene equally.
 *
 * It cannot be used to cast shadows as it does not have a direction.
 *
 * ```js
 * const light = new THREE.AmbientLight( 0x404040 ); // soft white light
 * scene.add( light );
 * ```
 *
 * @augments Light
 */
class AmbientLight extends Light {

	/**
	 * Constructs a new ambient light.
	 *
	 * @param {(number|Color|string)} [color=0xffffff] - The light's color.
	 * @param {number} [intensity=1] - The light's strength/intensity.
	 */
	constructor( color, intensity ) {

		super( color, intensity );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isAmbientLight = true;

		this.type = 'AmbientLight';

	}

}

/**
 * This class emits light uniformly across the face a rectangular plane.
 * This light type can be used to simulate light sources such as bright
 * windows or strip lighting.
 *
 * Important Notes:
 *
 * - There is no shadow support.
 * - Only PBR materials are supported.
 * - You have to include `RectAreaLightUniformsLib` (`WebGLRenderer`) or `RectAreaLightTexturesLib` (`WebGPURenderer`)
 * into your app and init the uniforms/textures.
 *
 * ```js
 * RectAreaLightUniformsLib.init(); // only relevant for WebGLRenderer
 * THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() ); //  only relevant for WebGPURenderer
 *
 * const intensity = 1; const width = 10; const height = 10;
 * const rectLight = new THREE.RectAreaLight( 0xffffff, intensity, width, height );
 * rectLight.position.set( 5, 5, 0 );
 * rectLight.lookAt( 0, 0, 0 );
 * scene.add( rectLight )
 * ```
 *
 * @augments Light
 */
class RectAreaLight extends Light {

	/**
	 * Constructs a new area light.
	 *
	 * @param {(number|Color|string)} [color=0xffffff] - The light's color.
	 * @param {number} [intensity=1] - The light's strength/intensity.
	 * @param {number} [width=10] - The width of the light.
	 * @param {number} [height=10] - The height of the light.
	 */
	constructor( color, intensity, width = 10, height = 10 ) {

		super( color, intensity );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isRectAreaLight = true;

		this.type = 'RectAreaLight';

		/**
		 * The width of the light.
		 *
		 * @type {number}
		 * @default 10
		 */
		this.width = width;

		/**
		 * The height of the light.
		 *
		 * @type {number}
		 * @default 10
		 */
		this.height = height;

	}

	/**
	 * The light's power. Power is the luminous power of the light measured in lumens (lm).
	 * Changing the power will also change the light's intensity.
	 *
	 * @type {number}
	 */
	get power() {

		// compute the light's luminous power (in lumens) from its intensity (in nits)
		return this.intensity * this.width * this.height * Math.PI;

	}

	set power( power ) {

		// set the light's intensity (in nits) from the desired luminous power (in lumens)
		this.intensity = power / ( this.width * this.height * Math.PI );

	}

	copy( source ) {

		super.copy( source );

		this.width = source.width;
		this.height = source.height;

		return this;

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.object.width = this.width;
		data.object.height = this.height;

		return data;

	}

}

/**
 * Represents a third-order spherical harmonics (SH). Light probes use this class
 * to encode lighting information.
 *
 * - Primary reference: {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf}
 * - Secondary reference: {@link https://www.ppsloan.org/publications/StupidSH36.pdf}
 */
class SphericalHarmonics3 {

	/**
	 * Constructs a new spherical harmonics.
	 */
	constructor() {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isSphericalHarmonics3 = true;

		/**
		 * An array holding the (9) SH coefficients.
		 *
		 * @type {Array<Vector3>}
		 */
		this.coefficients = [];

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients.push( new Vector3() );

		}

	}

	/**
	 * Sets the given SH coefficients to this instance by copying
	 * the values.
	 *
	 * @param {Array<Vector3>} coefficients - The SH coefficients.
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	set( coefficients ) {

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients[ i ].copy( coefficients[ i ] );

		}

		return this;

	}

	/**
	 * Sets all SH coefficients to `0`.
	 *
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	zero() {

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients[ i ].set( 0, 0, 0 );

		}

		return this;

	}

	/**
	 * Returns the radiance in the direction of the given normal.
	 *
	 * @param {Vector3} normal - The normal vector (assumed to be unit length)
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The radiance.
	 */
	getAt( normal, target ) {

		// normal is assumed to be unit length

		const x = normal.x, y = normal.y, z = normal.z;

		const coeff = this.coefficients;

		// band 0
		target.copy( coeff[ 0 ] ).multiplyScalar( 0.282095 );

		// band 1
		target.addScaledVector( coeff[ 1 ], 0.488603 * y );
		target.addScaledVector( coeff[ 2 ], 0.488603 * z );
		target.addScaledVector( coeff[ 3 ], 0.488603 * x );

		// band 2
		target.addScaledVector( coeff[ 4 ], 1.092548 * ( x * y ) );
		target.addScaledVector( coeff[ 5 ], 1.092548 * ( y * z ) );
		target.addScaledVector( coeff[ 6 ], 0.315392 * ( 3.0 * z * z - 1.0 ) );
		target.addScaledVector( coeff[ 7 ], 1.092548 * ( x * z ) );
		target.addScaledVector( coeff[ 8 ], 0.546274 * ( x * x - y * y ) );

		return target;

	}

	/**
	 * Returns the irradiance (radiance convolved with cosine lobe) in the
	 * direction of the given normal.
	 *
	 * @param {Vector3} normal - The normal vector (assumed to be unit length)
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The irradiance.
	 */
	getIrradianceAt( normal, target ) {

		// normal is assumed to be unit length

		const x = normal.x, y = normal.y, z = normal.z;

		const coeff = this.coefficients;

		// band 0
		target.copy( coeff[ 0 ] ).multiplyScalar( 0.886227 ); // π * 0.282095

		// band 1
		target.addScaledVector( coeff[ 1 ], 2.0 * 0.511664 * y ); // ( 2 * π / 3 ) * 0.488603
		target.addScaledVector( coeff[ 2 ], 2.0 * 0.511664 * z );
		target.addScaledVector( coeff[ 3 ], 2.0 * 0.511664 * x );

		// band 2
		target.addScaledVector( coeff[ 4 ], 2.0 * 0.429043 * x * y ); // ( π / 4 ) * 1.092548
		target.addScaledVector( coeff[ 5 ], 2.0 * 0.429043 * y * z );
		target.addScaledVector( coeff[ 6 ], 0.743125 * z * z - 0.247708 ); // ( π / 4 ) * 0.315392 * 3
		target.addScaledVector( coeff[ 7 ], 2.0 * 0.429043 * x * z );
		target.addScaledVector( coeff[ 8 ], 0.429043 * ( x * x - y * y ) ); // ( π / 4 ) * 0.546274

		return target;

	}

	/**
	 * Adds the given SH to this instance.
	 *
	 * @param {SphericalHarmonics3} sh - The SH to add.
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	add( sh ) {

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients[ i ].add( sh.coefficients[ i ] );

		}

		return this;

	}

	/**
	 * A convenience method for performing {@link SphericalHarmonics3#add} and
	 * {@link SphericalHarmonics3#scale} at once.
	 *
	 * @param {SphericalHarmonics3} sh - The SH to add.
	 * @param {number} s - The scale factor.
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	addScaledSH( sh, s ) {

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients[ i ].addScaledVector( sh.coefficients[ i ], s );

		}

		return this;

	}

	/**
	 * Scales this SH by the given scale factor.
	 *
	 * @param {number} s - The scale factor.
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	scale( s ) {

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients[ i ].multiplyScalar( s );

		}

		return this;

	}

	/**
	 * Linear interpolates between the given SH and this instance by the given
	 * alpha factor.
	 *
	 * @param {SphericalHarmonics3} sh - The SH to interpolate with.
	 * @param {number} alpha - The alpha factor.
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	lerp( sh, alpha ) {

		for ( let i = 0; i < 9; i ++ ) {

			this.coefficients[ i ].lerp( sh.coefficients[ i ], alpha );

		}

		return this;

	}

	/**
	 * Returns `true` if this spherical harmonics is equal with the given one.
	 *
	 * @param {SphericalHarmonics3} sh - The spherical harmonics to test for equality.
	 * @return {boolean} Whether this spherical harmonics is equal with the given one.
	 */
	equals( sh ) {

		for ( let i = 0; i < 9; i ++ ) {

			if ( ! this.coefficients[ i ].equals( sh.coefficients[ i ] ) ) {

				return false;

			}

		}

		return true;

	}

	/**
	 * Copies the values of the given spherical harmonics to this instance.
	 *
	 * @param {SphericalHarmonics3} sh - The spherical harmonics to copy.
	 * @return {SphericalHarmonics3} A reference to this spherical harmonics.
	 */
	copy( sh ) {

		return this.set( sh.coefficients );

	}

	/**
	 * Returns a new spherical harmonics with copied values from this instance.
	 *
	 * @return {SphericalHarmonics3} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	 * Sets the SH coefficients of this instance from the given array.
	 *
	 * @param {Array<number>} array - An array holding the SH coefficients.
	 * @param {number} [offset=0] - The array offset where to start copying.
	 * @return {SphericalHarmonics3} A clone of this instance.
	 */
	fromArray( array, offset = 0 ) {

		const coefficients = this.coefficients;

		for ( let i = 0; i < 9; i ++ ) {

			coefficients[ i ].fromArray( array, offset + ( i * 3 ) );

		}

		return this;

	}

	/**
	 * Returns an array with the SH coefficients, or copies them into the provided
	 * array. The coefficients are represented as numbers.
	 *
	 * @param {Array<number>} [array=[]] - The target array.
	 * @param {number} [offset=0] - The array offset where to start copying.
	 * @return {Array<number>} An array with flat SH coefficients.
	 */
	toArray( array = [], offset = 0 ) {

		const coefficients = this.coefficients;

		for ( let i = 0; i < 9; i ++ ) {

			coefficients[ i ].toArray( array, offset + ( i * 3 ) );

		}

		return array;

	}

	/**
	 * Computes the SH basis for the given normal vector.
	 *
	 * @param {Vector3} normal - The normal.
	 * @param {Array<number>} shBasis - The target array holding the SH basis.
	 */
	static getBasisAt( normal, shBasis ) {

		// normal is assumed to be unit length

		const x = normal.x, y = normal.y, z = normal.z;

		// band 0
		shBasis[ 0 ] = 0.282095;

		// band 1
		shBasis[ 1 ] = 0.488603 * y;
		shBasis[ 2 ] = 0.488603 * z;
		shBasis[ 3 ] = 0.488603 * x;

		// band 2
		shBasis[ 4 ] = 1.092548 * x * y;
		shBasis[ 5 ] = 1.092548 * y * z;
		shBasis[ 6 ] = 0.315392 * ( 3 * z * z - 1 );
		shBasis[ 7 ] = 1.092548 * x * z;
		shBasis[ 8 ] = 0.546274 * ( x * x - y * y );

	}

}

/**
 * Light probes are an alternative way of adding light to a 3D scene. Unlike
 * classical light sources (e.g. directional, point or spot lights), light
 * probes do not emit light. Instead they store information about light
 * passing through 3D space. During rendering, the light that hits a 3D
 * object is approximated by using the data from the light probe.
 *
 * Light probes are usually created from (radiance) environment maps. The
 * class {@link LightProbeGenerator} can be used to create light probes from
 * cube textures or render targets. However, light estimation data could also
 * be provided in other forms e.g. by WebXR. This enables the rendering of
 * augmented reality content that reacts to real world lighting.
 *
 * The current probe implementation in three.js supports so-called diffuse
 * light probes. This type of light probe is functionally equivalent to an
 * irradiance environment map.
 *
 * @augments Light
 */
class LightProbe extends Light {

	/**
	 * Constructs a new light probe.
	 *
	 * @param {SphericalHarmonics3} sh - The spherical harmonics which represents encoded lighting information.
	 * @param {number} [intensity=1] - The light's strength/intensity.
	 */
	constructor( sh = new SphericalHarmonics3(), intensity = 1 ) {

		super( undefined, intensity );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isLightProbe = true;

		/**
		 * A light probe uses spherical harmonics to encode lighting information.
		 *
		 * @type {SphericalHarmonics3}
		 */
		this.sh = sh;

	}

	copy( source ) {

		super.copy( source );

		this.sh.copy( source.sh );

		return this;

	}

	/**
	 * Deserializes the light prove from the given JSON.
	 *
	 * @param {Object} json - The JSON holding the serialized light probe.
	 * @return {LightProbe} A reference to this light probe.
	 */
	fromJSON( json ) {

		this.intensity = json.intensity; // TODO: Move this bit to Light.fromJSON();
		this.sh.fromArray( json.sh );

		return this;

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.object.sh = this.sh.toArray();

		return data;

	}

}

/**
 * Class for loading geometries. The files are internally
 * loaded via {@link FileLoader}.
 *
 * ```js
 * const loader = new THREE.MaterialLoader();
 * const material = await loader.loadAsync( 'material.json' );
 * ```
 * This loader does not support node materials. Use {@link NodeMaterialLoader} instead.
 *
 * @augments Loader
 */
class MaterialLoader extends Loader {

	/**
	 * Constructs a new material loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

		/**
		 * A dictionary holding textures used by the material.
		 *
		 * @type {Object<string,Texture>}
		 */
		this.textures = {};

	}

	/**
	 * Starts loading from the given URL and pass the loaded material to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(Material)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 */
	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( text ) {

			try {

				onLoad( scope.parse( JSON.parse( text ) ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	/**
	 * Parses the given JSON object and returns a material.
	 *
	 * @param {Object} json - The serialized material.
	 * @return {Material} The parsed material.
	 */
	parse( json ) {

		const textures = this.textures;

		function getTexture( name ) {

			if ( textures[ name ] === undefined ) {

				console.warn( 'THREE.MaterialLoader: Undefined texture', name );

			}

			return textures[ name ];

		}

		const material = this.createMaterialFromType( json.type );

		if ( json.uuid !== undefined ) material.uuid = json.uuid;
		if ( json.name !== undefined ) material.name = json.name;
		if ( json.color !== undefined && material.color !== undefined ) material.color.setHex( json.color );
		if ( json.roughness !== undefined ) material.roughness = json.roughness;
		if ( json.metalness !== undefined ) material.metalness = json.metalness;
		if ( json.sheen !== undefined ) material.sheen = json.sheen;
		if ( json.sheenColor !== undefined ) material.sheenColor = new Color().setHex( json.sheenColor );
		if ( json.sheenRoughness !== undefined ) material.sheenRoughness = json.sheenRoughness;
		if ( json.emissive !== undefined && material.emissive !== undefined ) material.emissive.setHex( json.emissive );
		if ( json.specular !== undefined && material.specular !== undefined ) material.specular.setHex( json.specular );
		if ( json.specularIntensity !== undefined ) material.specularIntensity = json.specularIntensity;
		if ( json.specularColor !== undefined && material.specularColor !== undefined ) material.specularColor.setHex( json.specularColor );
		if ( json.shininess !== undefined ) material.shininess = json.shininess;
		if ( json.clearcoat !== undefined ) material.clearcoat = json.clearcoat;
		if ( json.clearcoatRoughness !== undefined ) material.clearcoatRoughness = json.clearcoatRoughness;
		if ( json.dispersion !== undefined ) material.dispersion = json.dispersion;
		if ( json.iridescence !== undefined ) material.iridescence = json.iridescence;
		if ( json.iridescenceIOR !== undefined ) material.iridescenceIOR = json.iridescenceIOR;
		if ( json.iridescenceThicknessRange !== undefined ) material.iridescenceThicknessRange = json.iridescenceThicknessRange;
		if ( json.transmission !== undefined ) material.transmission = json.transmission;
		if ( json.thickness !== undefined ) material.thickness = json.thickness;
		if ( json.attenuationDistance !== undefined ) material.attenuationDistance = json.attenuationDistance;
		if ( json.attenuationColor !== undefined && material.attenuationColor !== undefined ) material.attenuationColor.setHex( json.attenuationColor );
		if ( json.anisotropy !== undefined ) material.anisotropy = json.anisotropy;
		if ( json.anisotropyRotation !== undefined ) material.anisotropyRotation = json.anisotropyRotation;
		if ( json.fog !== undefined ) material.fog = json.fog;
		if ( json.flatShading !== undefined ) material.flatShading = json.flatShading;
		if ( json.blending !== undefined ) material.blending = json.blending;
		if ( json.combine !== undefined ) material.combine = json.combine;
		if ( json.side !== undefined ) material.side = json.side;
		if ( json.shadowSide !== undefined ) material.shadowSide = json.shadowSide;
		if ( json.opacity !== undefined ) material.opacity = json.opacity;
		if ( json.transparent !== undefined ) material.transparent = json.transparent;
		if ( json.alphaTest !== undefined ) material.alphaTest = json.alphaTest;
		if ( json.alphaHash !== undefined ) material.alphaHash = json.alphaHash;
		if ( json.depthFunc !== undefined ) material.depthFunc = json.depthFunc;
		if ( json.depthTest !== undefined ) material.depthTest = json.depthTest;
		if ( json.depthWrite !== undefined ) material.depthWrite = json.depthWrite;
		if ( json.colorWrite !== undefined ) material.colorWrite = json.colorWrite;
		if ( json.blendSrc !== undefined ) material.blendSrc = json.blendSrc;
		if ( json.blendDst !== undefined ) material.blendDst = json.blendDst;
		if ( json.blendEquation !== undefined ) material.blendEquation = json.blendEquation;
		if ( json.blendSrcAlpha !== undefined ) material.blendSrcAlpha = json.blendSrcAlpha;
		if ( json.blendDstAlpha !== undefined ) material.blendDstAlpha = json.blendDstAlpha;
		if ( json.blendEquationAlpha !== undefined ) material.blendEquationAlpha = json.blendEquationAlpha;
		if ( json.blendColor !== undefined && material.blendColor !== undefined ) material.blendColor.setHex( json.blendColor );
		if ( json.blendAlpha !== undefined ) material.blendAlpha = json.blendAlpha;
		if ( json.stencilWriteMask !== undefined ) material.stencilWriteMask = json.stencilWriteMask;
		if ( json.stencilFunc !== undefined ) material.stencilFunc = json.stencilFunc;
		if ( json.stencilRef !== undefined ) material.stencilRef = json.stencilRef;
		if ( json.stencilFuncMask !== undefined ) material.stencilFuncMask = json.stencilFuncMask;
		if ( json.stencilFail !== undefined ) material.stencilFail = json.stencilFail;
		if ( json.stencilZFail !== undefined ) material.stencilZFail = json.stencilZFail;
		if ( json.stencilZPass !== undefined ) material.stencilZPass = json.stencilZPass;
		if ( json.stencilWrite !== undefined ) material.stencilWrite = json.stencilWrite;

		if ( json.wireframe !== undefined ) material.wireframe = json.wireframe;
		if ( json.wireframeLinewidth !== undefined ) material.wireframeLinewidth = json.wireframeLinewidth;
		if ( json.wireframeLinecap !== undefined ) material.wireframeLinecap = json.wireframeLinecap;
		if ( json.wireframeLinejoin !== undefined ) material.wireframeLinejoin = json.wireframeLinejoin;

		if ( json.rotation !== undefined ) material.rotation = json.rotation;

		if ( json.linewidth !== undefined ) material.linewidth = json.linewidth;
		if ( json.dashSize !== undefined ) material.dashSize = json.dashSize;
		if ( json.gapSize !== undefined ) material.gapSize = json.gapSize;
		if ( json.scale !== undefined ) material.scale = json.scale;

		if ( json.polygonOffset !== undefined ) material.polygonOffset = json.polygonOffset;
		if ( json.polygonOffsetFactor !== undefined ) material.polygonOffsetFactor = json.polygonOffsetFactor;
		if ( json.polygonOffsetUnits !== undefined ) material.polygonOffsetUnits = json.polygonOffsetUnits;

		if ( json.dithering !== undefined ) material.dithering = json.dithering;

		if ( json.alphaToCoverage !== undefined ) material.alphaToCoverage = json.alphaToCoverage;
		if ( json.premultipliedAlpha !== undefined ) material.premultipliedAlpha = json.premultipliedAlpha;
		if ( json.forceSinglePass !== undefined ) material.forceSinglePass = json.forceSinglePass;

		if ( json.visible !== undefined ) material.visible = json.visible;

		if ( json.toneMapped !== undefined ) material.toneMapped = json.toneMapped;

		if ( json.userData !== undefined ) material.userData = json.userData;

		if ( json.vertexColors !== undefined ) {

			if ( typeof json.vertexColors === 'number' ) {

				material.vertexColors = ( json.vertexColors > 0 ) ? true : false;

			} else {

				material.vertexColors = json.vertexColors;

			}

		}

		// Shader Material

		if ( json.uniforms !== undefined ) {

			for ( const name in json.uniforms ) {

				const uniform = json.uniforms[ name ];

				material.uniforms[ name ] = {};

				switch ( uniform.type ) {

					case 't':
						material.uniforms[ name ].value = getTexture( uniform.value );
						break;

					case 'c':
						material.uniforms[ name ].value = new Color().setHex( uniform.value );
						break;

					case 'v2':
						material.uniforms[ name ].value = new Vector2().fromArray( uniform.value );
						break;

					case 'v3':
						material.uniforms[ name ].value = new Vector3().fromArray( uniform.value );
						break;

					case 'v4':
						material.uniforms[ name ].value = new Vector4().fromArray( uniform.value );
						break;

					case 'm3':
						material.uniforms[ name ].value = new Matrix3().fromArray( uniform.value );
						break;

					case 'm4':
						material.uniforms[ name ].value = new Matrix4().fromArray( uniform.value );
						break;

					default:
						material.uniforms[ name ].value = uniform.value;

				}

			}

		}

		if ( json.defines !== undefined ) material.defines = json.defines;
		if ( json.vertexShader !== undefined ) material.vertexShader = json.vertexShader;
		if ( json.fragmentShader !== undefined ) material.fragmentShader = json.fragmentShader;
		if ( json.glslVersion !== undefined ) material.glslVersion = json.glslVersion;

		if ( json.extensions !== undefined ) {

			for ( const key in json.extensions ) {

				material.extensions[ key ] = json.extensions[ key ];

			}

		}

		if ( json.lights !== undefined ) material.lights = json.lights;
		if ( json.clipping !== undefined ) material.clipping = json.clipping;

		// for PointsMaterial

		if ( json.size !== undefined ) material.size = json.size;
		if ( json.sizeAttenuation !== undefined ) material.sizeAttenuation = json.sizeAttenuation;

		// maps

		if ( json.map !== undefined ) material.map = getTexture( json.map );
		if ( json.matcap !== undefined ) material.matcap = getTexture( json.matcap );

		if ( json.alphaMap !== undefined ) material.alphaMap = getTexture( json.alphaMap );

		if ( json.bumpMap !== undefined ) material.bumpMap = getTexture( json.bumpMap );
		if ( json.bumpScale !== undefined ) material.bumpScale = json.bumpScale;

		if ( json.normalMap !== undefined ) material.normalMap = getTexture( json.normalMap );
		if ( json.normalMapType !== undefined ) material.normalMapType = json.normalMapType;
		if ( json.normalScale !== undefined ) {

			let normalScale = json.normalScale;

			if ( Array.isArray( normalScale ) === false ) {

				// Blender exporter used to export a scalar. See #7459

				normalScale = [ normalScale, normalScale ];

			}

			material.normalScale = new Vector2().fromArray( normalScale );

		}

		if ( json.displacementMap !== undefined ) material.displacementMap = getTexture( json.displacementMap );
		if ( json.displacementScale !== undefined ) material.displacementScale = json.displacementScale;
		if ( json.displacementBias !== undefined ) material.displacementBias = json.displacementBias;

		if ( json.roughnessMap !== undefined ) material.roughnessMap = getTexture( json.roughnessMap );
		if ( json.metalnessMap !== undefined ) material.metalnessMap = getTexture( json.metalnessMap );

		if ( json.emissiveMap !== undefined ) material.emissiveMap = getTexture( json.emissiveMap );
		if ( json.emissiveIntensity !== undefined ) material.emissiveIntensity = json.emissiveIntensity;

		if ( json.specularMap !== undefined ) material.specularMap = getTexture( json.specularMap );
		if ( json.specularIntensityMap !== undefined ) material.specularIntensityMap = getTexture( json.specularIntensityMap );
		if ( json.specularColorMap !== undefined ) material.specularColorMap = getTexture( json.specularColorMap );

		if ( json.envMap !== undefined ) material.envMap = getTexture( json.envMap );
		if ( json.envMapRotation !== undefined ) material.envMapRotation.fromArray( json.envMapRotation );
		if ( json.envMapIntensity !== undefined ) material.envMapIntensity = json.envMapIntensity;

		if ( json.reflectivity !== undefined ) material.reflectivity = json.reflectivity;
		if ( json.refractionRatio !== undefined ) material.refractionRatio = json.refractionRatio;

		if ( json.lightMap !== undefined ) material.lightMap = getTexture( json.lightMap );
		if ( json.lightMapIntensity !== undefined ) material.lightMapIntensity = json.lightMapIntensity;

		if ( json.aoMap !== undefined ) material.aoMap = getTexture( json.aoMap );
		if ( json.aoMapIntensity !== undefined ) material.aoMapIntensity = json.aoMapIntensity;

		if ( json.gradientMap !== undefined ) material.gradientMap = getTexture( json.gradientMap );

		if ( json.clearcoatMap !== undefined ) material.clearcoatMap = getTexture( json.clearcoatMap );
		if ( json.clearcoatRoughnessMap !== undefined ) material.clearcoatRoughnessMap = getTexture( json.clearcoatRoughnessMap );
		if ( json.clearcoatNormalMap !== undefined ) material.clearcoatNormalMap = getTexture( json.clearcoatNormalMap );
		if ( json.clearcoatNormalScale !== undefined ) material.clearcoatNormalScale = new Vector2().fromArray( json.clearcoatNormalScale );

		if ( json.iridescenceMap !== undefined ) material.iridescenceMap = getTexture( json.iridescenceMap );
		if ( json.iridescenceThicknessMap !== undefined ) material.iridescenceThicknessMap = getTexture( json.iridescenceThicknessMap );

		if ( json.transmissionMap !== undefined ) material.transmissionMap = getTexture( json.transmissionMap );
		if ( json.thicknessMap !== undefined ) material.thicknessMap = getTexture( json.thicknessMap );

		if ( json.anisotropyMap !== undefined ) material.anisotropyMap = getTexture( json.anisotropyMap );

		if ( json.sheenColorMap !== undefined ) material.sheenColorMap = getTexture( json.sheenColorMap );
		if ( json.sheenRoughnessMap !== undefined ) material.sheenRoughnessMap = getTexture( json.sheenRoughnessMap );

		return material;

	}

	/**
	 * Textures are not embedded in the material JSON so they have
	 * to be injected before the loading process starts.
	 *
	 * @param {Object} value - A dictionary holding textures for material properties.
	 * @return {MaterialLoader} A reference to this material loader.
	 */
	setTextures( value ) {

		this.textures = value;
		return this;

	}

	/**
	 * Creates a material for the given type.
	 *
	 * @param {string} type - The material type.
	 * @return {Material} The new material.
	 */
	createMaterialFromType( type ) {

		return MaterialLoader.createMaterialFromType( type );

	}

	/**
	 * Creates a material for the given type.
	 *
	 * @static
	 * @param {string} type - The material type.
	 * @return {Material} The new material.
	 */
	static createMaterialFromType( type ) {

		const materialLib = {
			ShadowMaterial,
			SpriteMaterial,
			RawShaderMaterial,
			ShaderMaterial,
			PointsMaterial,
			MeshPhysicalMaterial,
			MeshStandardMaterial,
			MeshPhongMaterial,
			MeshToonMaterial,
			MeshNormalMaterial,
			MeshLambertMaterial,
			MeshDepthMaterial,
			MeshDistanceMaterial,
			MeshBasicMaterial,
			MeshMatcapMaterial,
			LineDashedMaterial,
			LineBasicMaterial,
			Material
		};

		return new materialLib[ type ]();

	}

}

/**
 * A class with loader utility functions.
 */
class LoaderUtils {

	/**
	 * Extracts the base URL from the given URL.
	 *
	 * @param {string} url -The URL to extract the base URL from.
	 * @return {string} The extracted base URL.
	 */
	static extractUrlBase( url ) {

		const index = url.lastIndexOf( '/' );

		if ( index === -1 ) return './';

		return url.slice( 0, index + 1 );

	}

	/**
	 * Resolves relative URLs against the given path. Absolute paths, data urls,
	 * and blob URLs will be returned as is. Invalid URLs will return an empty
	 * string.
	 *
	 * @param {string} url -The URL to resolve.
	 * @param {string} path - The base path for relative URLs to be resolved against.
	 * @return {string} The resolved URL.
	 */
	static resolveURL( url, path ) {

		// Invalid URL
		if ( typeof url !== 'string' || url === '' ) return '';

		// Host Relative URL
		if ( /^https?:\/\//i.test( path ) && /^\//.test( url ) ) {

			path = path.replace( /(^https?:\/\/[^\/]+).*/i, '$1' );

		}

		// Absolute URL http://,https://,//
		if ( /^(https?:)?\/\//i.test( url ) ) return url;

		// Data URI
		if ( /^data:.*,.*$/i.test( url ) ) return url;

		// Blob URL
		if ( /^blob:.*$/i.test( url ) ) return url;

		// Relative URL
		return path + url;

	}

}

/**
 * An instanced version of a geometry.
 */
class InstancedBufferGeometry extends BufferGeometry {

	/**
	 * Constructs a new instanced buffer geometry.
	 */
	constructor() {

		super();

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isInstancedBufferGeometry = true;

		this.type = 'InstancedBufferGeometry';

		/**
		 * The instance count.
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.instanceCount = Infinity;

	}

	copy( source ) {

		super.copy( source );

		this.instanceCount = source.instanceCount;

		return this;

	}

	toJSON() {

		const data = super.toJSON();

		data.instanceCount = this.instanceCount;

		data.isInstancedBufferGeometry = true;

		return data;

	}

}

/**
 * Class for loading geometries. The files are internally
 * loaded via {@link FileLoader}.
 *
 * ```js
 * const loader = new THREE.BufferGeometryLoader();
 * const geometry = await loader.loadAsync( 'models/json/pressure.json' );
 *
 * const material = new THREE.MeshBasicMaterial( { color: 0xF5F5F5 } );
 * const object = new THREE.Mesh( geometry, material );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 */
class BufferGeometryLoader extends Loader {

	/**
	 * Constructs a new geometry loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

	}

	/**
	 * Starts loading from the given URL and pass the loaded geometry to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(BufferGeometry)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 */
	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( text ) {

			try {

				onLoad( scope.parse( JSON.parse( text ) ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	/**
	 * Parses the given JSON object and returns a geometry.
	 *
	 * @param {Object} json - The serialized geometry.
	 * @return {BufferGeometry} The parsed geometry.
	 */
	parse( json ) {

		const interleavedBufferMap = {};
		const arrayBufferMap = {};

		function getInterleavedBuffer( json, uuid ) {

			if ( interleavedBufferMap[ uuid ] !== undefined ) return interleavedBufferMap[ uuid ];

			const interleavedBuffers = json.interleavedBuffers;
			const interleavedBuffer = interleavedBuffers[ uuid ];

			const buffer = getArrayBuffer( json, interleavedBuffer.buffer );

			const array = getTypedArray( interleavedBuffer.type, buffer );
			const ib = new InterleavedBuffer( array, interleavedBuffer.stride );
			ib.uuid = interleavedBuffer.uuid;

			interleavedBufferMap[ uuid ] = ib;

			return ib;

		}

		function getArrayBuffer( json, uuid ) {

			if ( arrayBufferMap[ uuid ] !== undefined ) return arrayBufferMap[ uuid ];

			const arrayBuffers = json.arrayBuffers;
			const arrayBuffer = arrayBuffers[ uuid ];

			const ab = new Uint32Array( arrayBuffer ).buffer;

			arrayBufferMap[ uuid ] = ab;

			return ab;

		}

		const geometry = json.isInstancedBufferGeometry ? new InstancedBufferGeometry() : new BufferGeometry();

		const index = json.data.index;

		if ( index !== undefined ) {

			const typedArray = getTypedArray( index.type, index.array );
			geometry.setIndex( new BufferAttribute( typedArray, 1 ) );

		}

		const attributes = json.data.attributes;

		for ( const key in attributes ) {

			const attribute = attributes[ key ];
			let bufferAttribute;

			if ( attribute.isInterleavedBufferAttribute ) {

				const interleavedBuffer = getInterleavedBuffer( json.data, attribute.data );
				bufferAttribute = new InterleavedBufferAttribute( interleavedBuffer, attribute.itemSize, attribute.offset, attribute.normalized );

			} else {

				const typedArray = getTypedArray( attribute.type, attribute.array );
				const bufferAttributeConstr = attribute.isInstancedBufferAttribute ? InstancedBufferAttribute : BufferAttribute;
				bufferAttribute = new bufferAttributeConstr( typedArray, attribute.itemSize, attribute.normalized );

			}

			if ( attribute.name !== undefined ) bufferAttribute.name = attribute.name;
			if ( attribute.usage !== undefined ) bufferAttribute.setUsage( attribute.usage );

			geometry.setAttribute( key, bufferAttribute );

		}

		const morphAttributes = json.data.morphAttributes;

		if ( morphAttributes ) {

			for ( const key in morphAttributes ) {

				const attributeArray = morphAttributes[ key ];

				const array = [];

				for ( let i = 0, il = attributeArray.length; i < il; i ++ ) {

					const attribute = attributeArray[ i ];
					let bufferAttribute;

					if ( attribute.isInterleavedBufferAttribute ) {

						const interleavedBuffer = getInterleavedBuffer( json.data, attribute.data );
						bufferAttribute = new InterleavedBufferAttribute( interleavedBuffer, attribute.itemSize, attribute.offset, attribute.normalized );

					} else {

						const typedArray = getTypedArray( attribute.type, attribute.array );
						bufferAttribute = new BufferAttribute( typedArray, attribute.itemSize, attribute.normalized );

					}

					if ( attribute.name !== undefined ) bufferAttribute.name = attribute.name;
					array.push( bufferAttribute );

				}

				geometry.morphAttributes[ key ] = array;

			}

		}

		const morphTargetsRelative = json.data.morphTargetsRelative;

		if ( morphTargetsRelative ) {

			geometry.morphTargetsRelative = true;

		}

		const groups = json.data.groups || json.data.drawcalls || json.data.offsets;

		if ( groups !== undefined ) {

			for ( let i = 0, n = groups.length; i !== n; ++ i ) {

				const group = groups[ i ];

				geometry.addGroup( group.start, group.count, group.materialIndex );

			}

		}

		const boundingSphere = json.data.boundingSphere;

		if ( boundingSphere !== undefined ) {

			geometry.boundingSphere = new Sphere().fromJSON( boundingSphere );

		}

		if ( json.name ) geometry.name = json.name;
		if ( json.userData ) geometry.userData = json.userData;

		return geometry;

	}

}

/**
 * A loader for loading a JSON resource in the [JSON Object/Scene format]{@link https://github.com/mrdoob/three.js/wiki/JSON-Object-Scene-format-4}.
 * The files are internally loaded via {@link FileLoader}.
 *
 * ```js
 * const loader = new THREE.ObjectLoader();
 * const obj = await loader.loadAsync( 'models/json/example.json' );
 * scene.add( obj );
 *
 * // Alternatively, to parse a previously loaded JSON structure
 * const object = await loader.parseAsync( a_json_object );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 */
class ObjectLoader extends Loader {

	/**
	 * Constructs a new object loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

	}

	/**
	 * Starts loading from the given URL and pass the loaded 3D object to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(Object3D)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 */
	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const path = ( this.path === '' ) ? LoaderUtils.extractUrlBase( url ) : this.path;
		this.resourcePath = this.resourcePath || path;

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( text ) {

			let json = null;

			try {

				json = JSON.parse( text );

			} catch ( error ) {

				if ( onError !== undefined ) onError( error );

				console.error( 'THREE:ObjectLoader: Can\'t parse ' + url + '.', error.message );

				return;

			}

			const metadata = json.metadata;

			if ( metadata === undefined || metadata.type === undefined || metadata.type.toLowerCase() === 'geometry' ) {

				if ( onError !== undefined ) onError( new Error( 'THREE.ObjectLoader: Can\'t load ' + url ) );

				console.error( 'THREE.ObjectLoader: Can\'t load ' + url );
				return;

			}

			scope.parse( json, onLoad );

		}, onProgress, onError );

	}

	/**
	 * Async version of {@link ObjectLoader#load}.
	 *
	 * @async
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @return {Promise<Object3D>} A Promise that resolves with the loaded 3D object.
	 */
	async loadAsync( url, onProgress ) {

		const scope = this;

		const path = ( this.path === '' ) ? LoaderUtils.extractUrlBase( url ) : this.path;
		this.resourcePath = this.resourcePath || path;

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );

		const text = await loader.loadAsync( url, onProgress );

		const json = JSON.parse( text );

		const metadata = json.metadata;

		if ( metadata === undefined || metadata.type === undefined || metadata.type.toLowerCase() === 'geometry' ) {

			throw new Error( 'THREE.ObjectLoader: Can\'t load ' + url );

		}

		return await scope.parseAsync( json );

	}

	/**
	 * Parses the given JSON. This is used internally by {@link ObjectLoader#load}
	 * but can also be used directly to parse a previously loaded JSON structure.
	 *
	 * @param {Object} json - The serialized 3D object.
	 * @param {onLoad} onLoad - Executed when all resources (e.g. textures) have been fully loaded.
	 * @return {Object3D} The parsed 3D object.
	 */
	parse( json, onLoad ) {

		const animations = this.parseAnimations( json.animations );
		const shapes = this.parseShapes( json.shapes );
		const geometries = this.parseGeometries( json.geometries, shapes );

		const images = this.parseImages( json.images, function () {

			if ( onLoad !== undefined ) onLoad( object );

		} );

		const textures = this.parseTextures( json.textures, images );
		const materials = this.parseMaterials( json.materials, textures );

		const object = this.parseObject( json.object, geometries, materials, textures, animations );
		const skeletons = this.parseSkeletons( json.skeletons, object );

		this.bindSkeletons( object, skeletons );
		this.bindLightTargets( object );

		//

		if ( onLoad !== undefined ) {

			let hasImages = false;

			for ( const uuid in images ) {

				if ( images[ uuid ].data instanceof HTMLImageElement ) {

					hasImages = true;
					break;

				}

			}

			if ( hasImages === false ) onLoad( object );

		}

		return object;

	}

	/**
	 * Async version of {@link ObjectLoader#parse}.
	 *
	 * @param {Object} json - The serialized 3D object.
	 * @return {Promise<Object3D>} A Promise that resolves with the parsed 3D object.
	 */
	async parseAsync( json ) {

		const animations = this.parseAnimations( json.animations );
		const shapes = this.parseShapes( json.shapes );
		const geometries = this.parseGeometries( json.geometries, shapes );

		const images = await this.parseImagesAsync( json.images );

		const textures = this.parseTextures( json.textures, images );
		const materials = this.parseMaterials( json.materials, textures );

		const object = this.parseObject( json.object, geometries, materials, textures, animations );
		const skeletons = this.parseSkeletons( json.skeletons, object );

		this.bindSkeletons( object, skeletons );
		this.bindLightTargets( object );

		return object;

	}

	// internals

	parseShapes( json ) {

		const shapes = {};

		if ( json !== undefined ) {

			for ( let i = 0, l = json.length; i < l; i ++ ) {

				const shape = new Shape().fromJSON( json[ i ] );

				shapes[ shape.uuid ] = shape;

			}

		}

		return shapes;

	}

	parseSkeletons( json, object ) {

		const skeletons = {};
		const bones = {};

		// generate bone lookup table

		object.traverse( function ( child ) {

			if ( child.isBone ) bones[ child.uuid ] = child;

		} );

		// create skeletons

		if ( json !== undefined ) {

			for ( let i = 0, l = json.length; i < l; i ++ ) {

				const skeleton = new Skeleton().fromJSON( json[ i ], bones );

				skeletons[ skeleton.uuid ] = skeleton;

			}

		}

		return skeletons;

	}

	parseGeometries( json, shapes ) {

		const geometries = {};

		if ( json !== undefined ) {

			const bufferGeometryLoader = new BufferGeometryLoader();

			for ( let i = 0, l = json.length; i < l; i ++ ) {

				let geometry;
				const data = json[ i ];

				switch ( data.type ) {

					case 'BufferGeometry':
					case 'InstancedBufferGeometry':

						geometry = bufferGeometryLoader.parse( data );
						break;

					default:

						if ( data.type in Geometries ) {

							geometry = Geometries[ data.type ].fromJSON( data, shapes );

						} else {

							console.warn( `THREE.ObjectLoader: Unsupported geometry type "${ data.type }"` );

						}

				}

				geometry.uuid = data.uuid;

				if ( data.name !== undefined ) geometry.name = data.name;
				if ( data.userData !== undefined ) geometry.userData = data.userData;

				geometries[ data.uuid ] = geometry;

			}

		}

		return geometries;

	}

	parseMaterials( json, textures ) {

		const cache = {}; // MultiMaterial
		const materials = {};

		if ( json !== undefined ) {

			const loader = new MaterialLoader();
			loader.setTextures( textures );

			for ( let i = 0, l = json.length; i < l; i ++ ) {

				const data = json[ i ];

				if ( cache[ data.uuid ] === undefined ) {

					cache[ data.uuid ] = loader.parse( data );

				}

				materials[ data.uuid ] = cache[ data.uuid ];

			}

		}

		return materials;

	}

	parseAnimations( json ) {

		const animations = {};

		if ( json !== undefined ) {

			for ( let i = 0; i < json.length; i ++ ) {

				const data = json[ i ];

				const clip = AnimationClip.parse( data );

				animations[ clip.uuid ] = clip;

			}

		}

		return animations;

	}

	parseImages( json, onLoad ) {

		const scope = this;
		const images = {};

		let loader;

		function loadImage( url ) {

			scope.manager.itemStart( url );

			return loader.load( url, function () {

				scope.manager.itemEnd( url );

			}, undefined, function () {

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			} );

		}

		function deserializeImage( image ) {

			if ( typeof image === 'string' ) {

				const url = image;

				const path = /^(\/\/)|([a-z]+:(\/\/)?)/i.test( url ) ? url : scope.resourcePath + url;

				return loadImage( path );

			} else {

				if ( image.data ) {

					return {
						data: getTypedArray( image.type, image.data ),
						width: image.width,
						height: image.height
					};

				} else {

					return null;

				}

			}

		}

		if ( json !== undefined && json.length > 0 ) {

			const manager = new LoadingManager( onLoad );

			loader = new ImageLoader( manager );
			loader.setCrossOrigin( this.crossOrigin );

			for ( let i = 0, il = json.length; i < il; i ++ ) {

				const image = json[ i ];
				const url = image.url;

				if ( Array.isArray( url ) ) {

					// load array of images e.g CubeTexture

					const imageArray = [];

					for ( let j = 0, jl = url.length; j < jl; j ++ ) {

						const currentUrl = url[ j ];

						const deserializedImage = deserializeImage( currentUrl );

						if ( deserializedImage !== null ) {

							if ( deserializedImage instanceof HTMLImageElement ) {

								imageArray.push( deserializedImage );

							} else {

								// special case: handle array of data textures for cube textures

								imageArray.push( new DataTexture( deserializedImage.data, deserializedImage.width, deserializedImage.height ) );

							}

						}

					}

					images[ image.uuid ] = new Source( imageArray );

				} else {

					// load single image

					const deserializedImage = deserializeImage( image.url );
					images[ image.uuid ] = new Source( deserializedImage );


				}

			}

		}

		return images;

	}

	async parseImagesAsync( json ) {

		const scope = this;
		const images = {};

		let loader;

		async function deserializeImage( image ) {

			if ( typeof image === 'string' ) {

				const url = image;

				const path = /^(\/\/)|([a-z]+:(\/\/)?)/i.test( url ) ? url : scope.resourcePath + url;

				return await loader.loadAsync( path );

			} else {

				if ( image.data ) {

					return {
						data: getTypedArray( image.type, image.data ),
						width: image.width,
						height: image.height
					};

				} else {

					return null;

				}

			}

		}

		if ( json !== undefined && json.length > 0 ) {

			loader = new ImageLoader( this.manager );
			loader.setCrossOrigin( this.crossOrigin );

			for ( let i = 0, il = json.length; i < il; i ++ ) {

				const image = json[ i ];
				const url = image.url;

				if ( Array.isArray( url ) ) {

					// load array of images e.g CubeTexture

					const imageArray = [];

					for ( let j = 0, jl = url.length; j < jl; j ++ ) {

						const currentUrl = url[ j ];

						const deserializedImage = await deserializeImage( currentUrl );

						if ( deserializedImage !== null ) {

							if ( deserializedImage instanceof HTMLImageElement ) {

								imageArray.push( deserializedImage );

							} else {

								// special case: handle array of data textures for cube textures

								imageArray.push( new DataTexture( deserializedImage.data, deserializedImage.width, deserializedImage.height ) );

							}

						}

					}

					images[ image.uuid ] = new Source( imageArray );

				} else {

					// load single image

					const deserializedImage = await deserializeImage( image.url );
					images[ image.uuid ] = new Source( deserializedImage );

				}

			}

		}

		return images;

	}

	parseTextures( json, images ) {

		function parseConstant( value, type ) {

			if ( typeof value === 'number' ) return value;

			console.warn( 'THREE.ObjectLoader.parseTexture: Constant should be in numeric form.', value );

			return type[ value ];

		}

		const textures = {};

		if ( json !== undefined ) {

			for ( let i = 0, l = json.length; i < l; i ++ ) {

				const data = json[ i ];

				if ( data.image === undefined ) {

					console.warn( 'THREE.ObjectLoader: No "image" specified for', data.uuid );

				}

				if ( images[ data.image ] === undefined ) {

					console.warn( 'THREE.ObjectLoader: Undefined image', data.image );

				}

				const source = images[ data.image ];
				const image = source.data;

				let texture;

				if ( Array.isArray( image ) ) {

					texture = new CubeTexture();

					if ( image.length === 6 ) texture.needsUpdate = true;

				} else {

					if ( image && image.data ) {

						texture = new DataTexture();

					} else {

						texture = new Texture();

					}

					if ( image ) texture.needsUpdate = true; // textures can have undefined image data

				}

				texture.source = source;

				texture.uuid = data.uuid;

				if ( data.name !== undefined ) texture.name = data.name;

				if ( data.mapping !== undefined ) texture.mapping = parseConstant( data.mapping, TEXTURE_MAPPING );
				if ( data.channel !== undefined ) texture.channel = data.channel;

				if ( data.offset !== undefined ) texture.offset.fromArray( data.offset );
				if ( data.repeat !== undefined ) texture.repeat.fromArray( data.repeat );
				if ( data.center !== undefined ) texture.center.fromArray( data.center );
				if ( data.rotation !== undefined ) texture.rotation = data.rotation;

				if ( data.wrap !== undefined ) {

					texture.wrapS = parseConstant( data.wrap[ 0 ], TEXTURE_WRAPPING );
					texture.wrapT = parseConstant( data.wrap[ 1 ], TEXTURE_WRAPPING );

				}

				if ( data.format !== undefined ) texture.format = data.format;
				if ( data.internalFormat !== undefined ) texture.internalFormat = data.internalFormat;
				if ( data.type !== undefined ) texture.type = data.type;
				if ( data.colorSpace !== undefined ) texture.colorSpace = data.colorSpace;

				if ( data.minFilter !== undefined ) texture.minFilter = parseConstant( data.minFilter, TEXTURE_FILTER );
				if ( data.magFilter !== undefined ) texture.magFilter = parseConstant( data.magFilter, TEXTURE_FILTER );
				if ( data.anisotropy !== undefined ) texture.anisotropy = data.anisotropy;

				if ( data.flipY !== undefined ) texture.flipY = data.flipY;

				if ( data.generateMipmaps !== undefined ) texture.generateMipmaps = data.generateMipmaps;
				if ( data.premultiplyAlpha !== undefined ) texture.premultiplyAlpha = data.premultiplyAlpha;
				if ( data.unpackAlignment !== undefined ) texture.unpackAlignment = data.unpackAlignment;
				if ( data.compareFunction !== undefined ) texture.compareFunction = data.compareFunction;

				if ( data.userData !== undefined ) texture.userData = data.userData;

				textures[ data.uuid ] = texture;

			}

		}

		return textures;

	}

	parseObject( data, geometries, materials, textures, animations ) {

		let object;

		function getGeometry( name ) {

			if ( geometries[ name ] === undefined ) {

				console.warn( 'THREE.ObjectLoader: Undefined geometry', name );

			}

			return geometries[ name ];

		}

		function getMaterial( name ) {

			if ( name === undefined ) return undefined;

			if ( Array.isArray( name ) ) {

				const array = [];

				for ( let i = 0, l = name.length; i < l; i ++ ) {

					const uuid = name[ i ];

					if ( materials[ uuid ] === undefined ) {

						console.warn( 'THREE.ObjectLoader: Undefined material', uuid );

					}

					array.push( materials[ uuid ] );

				}

				return array;

			}

			if ( materials[ name ] === undefined ) {

				console.warn( 'THREE.ObjectLoader: Undefined material', name );

			}

			return materials[ name ];

		}

		function getTexture( uuid ) {

			if ( textures[ uuid ] === undefined ) {

				console.warn( 'THREE.ObjectLoader: Undefined texture', uuid );

			}

			return textures[ uuid ];

		}

		let geometry, material;

		switch ( data.type ) {

			case 'Scene':

				object = new Scene();

				if ( data.background !== undefined ) {

					if ( Number.isInteger( data.background ) ) {

						object.background = new Color( data.background );

					} else {

						object.background = getTexture( data.background );

					}

				}

				if ( data.environment !== undefined ) {

					object.environment = getTexture( data.environment );

				}

				if ( data.fog !== undefined ) {

					if ( data.fog.type === 'Fog' ) {

						object.fog = new Fog( data.fog.color, data.fog.near, data.fog.far );

					} else if ( data.fog.type === 'FogExp2' ) {

						object.fog = new FogExp2( data.fog.color, data.fog.density );

					}

					if ( data.fog.name !== '' ) {

						object.fog.name = data.fog.name;

					}

				}

				if ( data.backgroundBlurriness !== undefined ) object.backgroundBlurriness = data.backgroundBlurriness;
				if ( data.backgroundIntensity !== undefined ) object.backgroundIntensity = data.backgroundIntensity;
				if ( data.backgroundRotation !== undefined ) object.backgroundRotation.fromArray( data.backgroundRotation );

				if ( data.environmentIntensity !== undefined ) object.environmentIntensity = data.environmentIntensity;
				if ( data.environmentRotation !== undefined ) object.environmentRotation.fromArray( data.environmentRotation );

				break;

			case 'PerspectiveCamera':

				object = new PerspectiveCamera( data.fov, data.aspect, data.near, data.far );

				if ( data.focus !== undefined ) object.focus = data.focus;
				if ( data.zoom !== undefined ) object.zoom = data.zoom;
				if ( data.filmGauge !== undefined ) object.filmGauge = data.filmGauge;
				if ( data.filmOffset !== undefined ) object.filmOffset = data.filmOffset;
				if ( data.view !== undefined ) object.view = Object.assign( {}, data.view );

				break;

			case 'OrthographicCamera':

				object = new OrthographicCamera( data.left, data.right, data.top, data.bottom, data.near, data.far );

				if ( data.zoom !== undefined ) object.zoom = data.zoom;
				if ( data.view !== undefined ) object.view = Object.assign( {}, data.view );

				break;

			case 'AmbientLight':

				object = new AmbientLight( data.color, data.intensity );

				break;

			case 'DirectionalLight':

				object = new DirectionalLight( data.color, data.intensity );
				object.target = data.target || '';

				break;

			case 'PointLight':

				object = new PointLight( data.color, data.intensity, data.distance, data.decay );

				break;

			case 'RectAreaLight':

				object = new RectAreaLight( data.color, data.intensity, data.width, data.height );

				break;

			case 'SpotLight':

				object = new SpotLight( data.color, data.intensity, data.distance, data.angle, data.penumbra, data.decay );
				object.target = data.target || '';

				break;

			case 'HemisphereLight':

				object = new HemisphereLight( data.color, data.groundColor, data.intensity );

				break;

			case 'LightProbe':

				object = new LightProbe().fromJSON( data );

				break;

			case 'SkinnedMesh':

				geometry = getGeometry( data.geometry );
			 	material = getMaterial( data.material );

				object = new SkinnedMesh( geometry, material );

				if ( data.bindMode !== undefined ) object.bindMode = data.bindMode;
				if ( data.bindMatrix !== undefined ) object.bindMatrix.fromArray( data.bindMatrix );
				if ( data.skeleton !== undefined ) object.skeleton = data.skeleton;

				break;

			case 'Mesh':

				geometry = getGeometry( data.geometry );
				material = getMaterial( data.material );

				object = new Mesh( geometry, material );

				break;

			case 'InstancedMesh':

				geometry = getGeometry( data.geometry );
				material = getMaterial( data.material );
				const count = data.count;
				const instanceMatrix = data.instanceMatrix;
				const instanceColor = data.instanceColor;

				object = new InstancedMesh( geometry, material, count );
				object.instanceMatrix = new InstancedBufferAttribute( new Float32Array( instanceMatrix.array ), 16 );
				if ( instanceColor !== undefined ) object.instanceColor = new InstancedBufferAttribute( new Float32Array( instanceColor.array ), instanceColor.itemSize );

				break;

			case 'BatchedMesh':

				geometry = getGeometry( data.geometry );
				material = getMaterial( data.material );

				object = new BatchedMesh( data.maxInstanceCount, data.maxVertexCount, data.maxIndexCount, material );
				object.geometry = geometry;
				object.perObjectFrustumCulled = data.perObjectFrustumCulled;
				object.sortObjects = data.sortObjects;

				object._drawRanges = data.drawRanges;
				object._reservedRanges = data.reservedRanges;

				object._geometryInfo = data.geometryInfo.map( info => {

					let box = null;
					let sphere = null;
					if ( info.boundingBox !== undefined ) {

						box = new Box3().fromJSON( info.boundingBox );

					}

					if ( info.boundingSphere !== undefined ) {

						sphere = new Sphere().fromJSON( info.boundingSphere );

					}

					return {
						...info,
						boundingBox: box,
						boundingSphere: sphere
					};

				} );
				object._instanceInfo = data.instanceInfo;

				object._availableInstanceIds = data._availableInstanceIds;
				object._availableGeometryIds = data._availableGeometryIds;

				object._nextIndexStart = data.nextIndexStart;
				object._nextVertexStart = data.nextVertexStart;
				object._geometryCount = data.geometryCount;

				object._maxInstanceCount = data.maxInstanceCount;
				object._maxVertexCount = data.maxVertexCount;
				object._maxIndexCount = data.maxIndexCount;

				object._geometryInitialized = data.geometryInitialized;

				object._matricesTexture = getTexture( data.matricesTexture.uuid );

				object._indirectTexture = getTexture( data.indirectTexture.uuid );

				if ( data.colorsTexture !== undefined ) {

					object._colorsTexture = getTexture( data.colorsTexture.uuid );

				}

				if ( data.boundingSphere !== undefined ) {

					object.boundingSphere = new Sphere().fromJSON( data.boundingSphere );

				}

				if ( data.boundingBox !== undefined ) {

					object.boundingBox = new Box3().fromJSON( data.boundingBox );

				}

				break;

			case 'LOD':

				object = new LOD();

				break;

			case 'Line':

				object = new Line( getGeometry( data.geometry ), getMaterial( data.material ) );

				break;

			case 'LineLoop':

				object = new LineLoop( getGeometry( data.geometry ), getMaterial( data.material ) );

				break;

			case 'LineSegments':

				object = new LineSegments( getGeometry( data.geometry ), getMaterial( data.material ) );

				break;

			case 'PointCloud':
			case 'Points':

				object = new Points( getGeometry( data.geometry ), getMaterial( data.material ) );

				break;

			case 'Sprite':

				object = new Sprite( getMaterial( data.material ) );

				break;

			case 'Group':

				object = new Group();

				break;

			case 'Bone':

				object = new Bone();

				break;

			default:

				object = new Object3D();

		}

		object.uuid = data.uuid;

		if ( data.name !== undefined ) object.name = data.name;

		if ( data.matrix !== undefined ) {

			object.matrix.fromArray( data.matrix );

			if ( data.matrixAutoUpdate !== undefined ) object.matrixAutoUpdate = data.matrixAutoUpdate;
			if ( object.matrixAutoUpdate ) object.matrix.decompose( object.position, object.quaternion, object.scale );

		} else {

			if ( data.position !== undefined ) object.position.fromArray( data.position );
			if ( data.rotation !== undefined ) object.rotation.fromArray( data.rotation );
			if ( data.quaternion !== undefined ) object.quaternion.fromArray( data.quaternion );
			if ( data.scale !== undefined ) object.scale.fromArray( data.scale );

		}

		if ( data.up !== undefined ) object.up.fromArray( data.up );

		if ( data.castShadow !== undefined ) object.castShadow = data.castShadow;
		if ( data.receiveShadow !== undefined ) object.receiveShadow = data.receiveShadow;

		if ( data.shadow ) {

			if ( data.shadow.intensity !== undefined ) object.shadow.intensity = data.shadow.intensity;
			if ( data.shadow.bias !== undefined ) object.shadow.bias = data.shadow.bias;
			if ( data.shadow.normalBias !== undefined ) object.shadow.normalBias = data.shadow.normalBias;
			if ( data.shadow.radius !== undefined ) object.shadow.radius = data.shadow.radius;
			if ( data.shadow.mapSize !== undefined ) object.shadow.mapSize.fromArray( data.shadow.mapSize );
			if ( data.shadow.camera !== undefined ) object.shadow.camera = this.parseObject( data.shadow.camera );

		}

		if ( data.visible !== undefined ) object.visible = data.visible;
		if ( data.frustumCulled !== undefined ) object.frustumCulled = data.frustumCulled;
		if ( data.renderOrder !== undefined ) object.renderOrder = data.renderOrder;
		if ( data.userData !== undefined ) object.userData = data.userData;
		if ( data.layers !== undefined ) object.layers.mask = data.layers;

		if ( data.children !== undefined ) {

			const children = data.children;

			for ( let i = 0; i < children.length; i ++ ) {

				object.add( this.parseObject( children[ i ], geometries, materials, textures, animations ) );

			}

		}

		if ( data.animations !== undefined ) {

			const objectAnimations = data.animations;

			for ( let i = 0; i < objectAnimations.length; i ++ ) {

				const uuid = objectAnimations[ i ];

				object.animations.push( animations[ uuid ] );

			}

		}

		if ( data.type === 'LOD' ) {

			if ( data.autoUpdate !== undefined ) object.autoUpdate = data.autoUpdate;

			const levels = data.levels;

			for ( let l = 0; l < levels.length; l ++ ) {

				const level = levels[ l ];
				const child = object.getObjectByProperty( 'uuid', level.object );

				if ( child !== undefined ) {

					object.addLevel( child, level.distance, level.hysteresis );

				}

			}

		}

		return object;

	}

	bindSkeletons( object, skeletons ) {

		if ( Object.keys( skeletons ).length === 0 ) return;

		object.traverse( function ( child ) {

			if ( child.isSkinnedMesh === true && child.skeleton !== undefined ) {

				const skeleton = skeletons[ child.skeleton ];

				if ( skeleton === undefined ) {

					console.warn( 'THREE.ObjectLoader: No skeleton found with UUID:', child.skeleton );

				} else {

					child.bind( skeleton, child.bindMatrix );

				}

			}

		} );

	}

	bindLightTargets( object ) {

		object.traverse( function ( child ) {

			if ( child.isDirectionalLight || child.isSpotLight ) {

				const uuid = child.target;

				const target = object.getObjectByProperty( 'uuid', uuid );

				if ( target !== undefined ) {

					child.target = target;

				} else {

					child.target = new Object3D();

				}

			}

		} );

	}

}

const TEXTURE_MAPPING = {
	UVMapping: UVMapping,
	CubeReflectionMapping: CubeReflectionMapping,
	CubeRefractionMapping: CubeRefractionMapping,
	EquirectangularReflectionMapping: EquirectangularReflectionMapping,
	EquirectangularRefractionMapping: EquirectangularRefractionMapping,
	CubeUVReflectionMapping: CubeUVReflectionMapping
};

const TEXTURE_WRAPPING = {
	RepeatWrapping: RepeatWrapping,
	ClampToEdgeWrapping: ClampToEdgeWrapping,
	MirroredRepeatWrapping: MirroredRepeatWrapping
};

const TEXTURE_FILTER = {
	NearestFilter: NearestFilter,
	NearestMipmapNearestFilter: NearestMipmapNearestFilter,
	NearestMipmapLinearFilter: NearestMipmapLinearFilter,
	LinearFilter: LinearFilter,
	LinearMipmapNearestFilter: LinearMipmapNearestFilter,
	LinearMipmapLinearFilter: LinearMipmapLinearFilter
};

const _errorMap = new WeakMap();

/**
 * A loader for loading images as an [ImageBitmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap}.
 * An `ImageBitmap` provides an asynchronous and resource efficient pathway to prepare
 * textures for rendering.
 *
 * Note that {@link Texture#flipY} and {@link Texture#premultiplyAlpha} are ignored with image bitmaps.
 * They needs these configuration on bitmap creation unlike regular images need them on uploading to GPU.
 *
 * You need to set the equivalent options via {@link ImageBitmapLoader#setOptions} instead.
 *
 * Also note that unlike {@link FileLoader}, this loader avoids multiple concurrent requests to the same URL only if `Cache` is enabled.
 *
 * ```js
 * const loader = new THREE.ImageBitmapLoader();
 * loader.setOptions( { imageOrientation: 'flipY' } ); // set options if needed
 * const imageBitmap = await loader.loadAsync( 'image.png' );
 *
 * const texture = new THREE.Texture( imageBitmap );
 * texture.needsUpdate = true;
 * ```
 *
 * @augments Loader
 */
class ImageBitmapLoader extends Loader {

	/**
	 * Constructs a new image bitmap loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isImageBitmapLoader = true;

		if ( typeof createImageBitmap === 'undefined' ) {

			console.warn( 'THREE.ImageBitmapLoader: createImageBitmap() not supported.' );

		}

		if ( typeof fetch === 'undefined' ) {

			console.warn( 'THREE.ImageBitmapLoader: fetch() not supported.' );

		}

		/**
		 * Represents the loader options.
		 *
		 * @type {Object}
		 * @default {premultiplyAlpha:'none'}
		 */
		this.options = { premultiplyAlpha: 'none' };

		/**
		 * Used for aborting requests.
		 *
		 * @private
		 * @type {AbortController}
		 */
		this._abortController = new AbortController();

	}

	/**
	 * Sets the given loader options. The structure of the object must match the `options` parameter of
	 * [createImageBitmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap}.
	 *
	 * @param {Object} options - The loader options to set.
	 * @return {ImageBitmapLoader} A reference to this image bitmap loader.
	 */
	setOptions( options ) {

		this.options = options;

		return this;

	}

	/**
	 * Starts loading from the given URL and pass the loaded image bitmap to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(ImageBitmap)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Unsupported in this loader.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 * @return {ImageBitmap|undefined} The image bitmap.
	 */
	load( url, onLoad, onProgress, onError ) {

		if ( url === undefined ) url = '';

		if ( this.path !== undefined ) url = this.path + url;

		url = this.manager.resolveURL( url );

		const scope = this;

		const cached = Cache.get( `image-bitmap:${url}` );

		if ( cached !== undefined ) {

			scope.manager.itemStart( url );

			// If cached is a promise, wait for it to resolve
			if ( cached.then ) {

				cached.then( imageBitmap => {

					// check if there is an error for the cached promise

					if ( _errorMap.has( cached ) === true ) {

						if ( onError ) onError( _errorMap.get( cached ) );

						scope.manager.itemError( url );
						scope.manager.itemEnd( url );

					} else {

						if ( onLoad ) onLoad( imageBitmap );

						scope.manager.itemEnd( url );

						return imageBitmap;

					}

				} );

				return;

			}

			// If cached is not a promise (i.e., it's already an imageBitmap)
			setTimeout( function () {

				if ( onLoad ) onLoad( cached );

				scope.manager.itemEnd( url );

			}, 0 );

			return cached;

		}

		const fetchOptions = {};
		fetchOptions.credentials = ( this.crossOrigin === 'anonymous' ) ? 'same-origin' : 'include';
		fetchOptions.headers = this.requestHeader;
		fetchOptions.signal = ( typeof AbortSignal.any === 'function' ) ? AbortSignal.any( [ this._abortController.signal, this.manager.abortController.signal ] ) : this._abortController.signal;

		const promise = fetch( url, fetchOptions ).then( function ( res ) {

			return res.blob();

		} ).then( function ( blob ) {

			return createImageBitmap( blob, Object.assign( scope.options, { colorSpaceConversion: 'none' } ) );

		} ).then( function ( imageBitmap ) {

			Cache.add( `image-bitmap:${url}`, imageBitmap );

			if ( onLoad ) onLoad( imageBitmap );

			scope.manager.itemEnd( url );

			return imageBitmap;

		} ).catch( function ( e ) {

			if ( onError ) onError( e );

			_errorMap.set( promise, e );

			Cache.remove( `image-bitmap:${url}` );

			scope.manager.itemError( url );
			scope.manager.itemEnd( url );

		} );

		Cache.add( `image-bitmap:${url}`, promise );
		scope.manager.itemStart( url );

	}

	/**
	 * Aborts ongoing fetch requests.
	 *
	 * @return {ImageBitmapLoader} A reference to this instance.
	 */
	abort() {

		this._abortController.abort();
		this._abortController = new AbortController();

		return this;

	}

}

let _context;

/**
 * Manages the global audio context in the engine.
 *
 * @hideconstructor
 */
class AudioContext {

	/**
	 * Returns the global native audio context.
	 *
	 * @return {AudioContext} The native audio context.
	 */
	static getContext() {

		if ( _context === undefined ) {

			_context = new ( window.AudioContext || window.webkitAudioContext )();

		}

		return _context;

	}

	/**
	 * Allows to set the global native audio context from outside.
	 *
	 * @param {AudioContext} value - The native context to set.
	 */
	static setContext( value ) {

		_context = value;

	}

}

/**
 * Class for loading audio buffers. Audios are internally
 * loaded via {@link FileLoader}.
 *
 * ```js
 * const audioListener = new THREE.AudioListener();
 * const ambientSound = new THREE.Audio( audioListener );
 *
 * const loader = new THREE.AudioLoader();
 * const audioBuffer = await loader.loadAsync( 'audio/ambient_ocean.ogg' );
 *
 * ambientSound.setBuffer( audioBuffer );
 * ambientSound.play();
 * ```
 *
 * @augments Loader
 */
class AudioLoader extends Loader {

	/**
	 * Constructs a new audio loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

	}

	/**
	 * Starts loading from the given URL and passes the loaded audio buffer
	 * to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(AudioBuffer)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 */
	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( this.manager );
		loader.setResponseType( 'arraybuffer' );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( buffer ) {

			try {

				// Create a copy of the buffer. The `decodeAudioData` method
				// detaches the buffer when complete, preventing reuse.
				const bufferCopy = buffer.slice( 0 );

				const context = AudioContext.getContext();
				context.decodeAudioData( bufferCopy, function ( audioBuffer ) {

					onLoad( audioBuffer );

				} ).catch( handleError );

			} catch ( e ) {

				handleError( e );

			}

		}, onProgress, onError );

		function handleError( e ) {

			if ( onError ) {

				onError( e );

			} else {

				console.error( e );

			}

			scope.manager.itemError( url );

		}

	}

}

const _eyeRight = /*@__PURE__*/ new Matrix4();
const _eyeLeft = /*@__PURE__*/ new Matrix4();
const _projectionMatrix = /*@__PURE__*/ new Matrix4();

/**
 * A special type of camera that uses two perspective cameras with
 * stereoscopic projection. Can be used for rendering stereo effects
 * like [3D Anaglyph]{@link https://en.wikipedia.org/wiki/Anaglyph_3D} or
 * [Parallax Barrier]{@link https://en.wikipedia.org/wiki/parallax_barrier}.
 */
class StereoCamera {

	/**
	 * Constructs a new stereo camera.
	 */
	constructor() {

		/**
		 * The type property is used for detecting the object type
		 * in context of serialization/deserialization.
		 *
		 * @type {string}
		 * @readonly
		 */
		this.type = 'StereoCamera';

		/**
		 * The aspect.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.aspect = 1;

		/**
		 * The eye separation which represents the distance
		 * between the left and right camera.
		 *
		 * @type {number}
		 * @default 0.064
		 */
		this.eyeSep = 0.064;

		/**
		 * The camera representing the left eye. This is added to layer `1` so objects to be
		 * rendered by the left camera must also be added to this layer.
		 *
		 * @type {PerspectiveCamera}
		 */
		this.cameraL = new PerspectiveCamera();
		this.cameraL.layers.enable( 1 );
		this.cameraL.matrixAutoUpdate = false;

		/**
		 * The camera representing the right eye. This is added to layer `2` so objects to be
		 * rendered by the right camera must also be added to this layer.
		 *
		 * @type {PerspectiveCamera}
		 */
		this.cameraR = new PerspectiveCamera();
		this.cameraR.layers.enable( 2 );
		this.cameraR.matrixAutoUpdate = false;

		this._cache = {
			focus: null,
			fov: null,
			aspect: null,
			near: null,
			far: null,
			zoom: null,
			eyeSep: null
		};

	}

	/**
	 * Updates the stereo camera based on the given perspective camera.
	 *
	 * @param {PerspectiveCamera} camera - The perspective camera.
	 */
	update( camera ) {

		const cache = this._cache;

		const needsUpdate = cache.focus !== camera.focus || cache.fov !== camera.fov ||
			cache.aspect !== camera.aspect * this.aspect || cache.near !== camera.near ||
			cache.far !== camera.far || cache.zoom !== camera.zoom || cache.eyeSep !== this.eyeSep;

		if ( needsUpdate ) {

			cache.focus = camera.focus;
			cache.fov = camera.fov;
			cache.aspect = camera.aspect * this.aspect;
			cache.near = camera.near;
			cache.far = camera.far;
			cache.zoom = camera.zoom;
			cache.eyeSep = this.eyeSep;

			// Off-axis stereoscopic effect based on
			// http://paulbourke.net/stereographics/stereorender/

			_projectionMatrix.copy( camera.projectionMatrix );
			const eyeSepHalf = cache.eyeSep / 2;
			const eyeSepOnProjection = eyeSepHalf * cache.near / cache.focus;
			const ymax = ( cache.near * Math.tan( DEG2RAD * cache.fov * 0.5 ) ) / cache.zoom;
			let xmin, xmax;

			// translate xOffset

			_eyeLeft.elements[ 12 ] = - eyeSepHalf;
			_eyeRight.elements[ 12 ] = eyeSepHalf;

			// for left eye

			xmin = - ymax * cache.aspect + eyeSepOnProjection;
			xmax = ymax * cache.aspect + eyeSepOnProjection;

			_projectionMatrix.elements[ 0 ] = 2 * cache.near / ( xmax - xmin );
			_projectionMatrix.elements[ 8 ] = ( xmax + xmin ) / ( xmax - xmin );

			this.cameraL.projectionMatrix.copy( _projectionMatrix );

			// for right eye

			xmin = - ymax * cache.aspect - eyeSepOnProjection;
			xmax = ymax * cache.aspect - eyeSepOnProjection;

			_projectionMatrix.elements[ 0 ] = 2 * cache.near / ( xmax - xmin );
			_projectionMatrix.elements[ 8 ] = ( xmax + xmin ) / ( xmax - xmin );

			this.cameraR.projectionMatrix.copy( _projectionMatrix );

		}

		this.cameraL.matrixWorld.copy( camera.matrixWorld ).multiply( _eyeLeft );
		this.cameraR.matrixWorld.copy( camera.matrixWorld ).multiply( _eyeRight );

	}

}

/**
 * This type of camera can be used in order to efficiently render a scene with a
 * predefined set of cameras. This is an important performance aspect for
 * rendering VR scenes.
 *
 * An instance of `ArrayCamera` always has an array of sub cameras. It's mandatory
 * to define for each sub camera the `viewport` property which determines the
 * part of the viewport that is rendered with this camera.
 *
 * @augments PerspectiveCamera
 */
class ArrayCamera extends PerspectiveCamera {

	/**
	 * Constructs a new array camera.
	 *
	 * @param {Array<PerspectiveCamera>} [array=[]] - An array of perspective sub cameras.
	 */
	constructor( array = [] ) {

		super();

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isArrayCamera = true;

		/**
		 * Whether this camera is used with multiview rendering or not.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default false
		 */
		this.isMultiViewCamera = false;

		/**
		 * An array of perspective sub cameras.
		 *
		 * @type {Array<PerspectiveCamera>}
		 */
		this.cameras = array;

	}

}

/**
 * Class for keeping track of time.
 */
class Clock {

	/**
	 * Constructs a new clock.
	 *
	 * @param {boolean} [autoStart=true] - Whether to automatically start the clock when
	 * `getDelta()` is called for the first time.
	 */
	constructor( autoStart = true ) {

		/**
		 * If set to `true`, the clock starts automatically when `getDelta()` is called
		 * for the first time.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.autoStart = autoStart;

		/**
		 * Holds the time at which the clock's `start()` method was last called.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.startTime = 0;

		/**
		 * Holds the time at which the clock's `start()`, `getElapsedTime()` or
		 * `getDelta()` methods were last called.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.oldTime = 0;

		/**
		 * Keeps track of the total time that the clock has been running.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.elapsedTime = 0;

		/**
		 * Whether the clock is running or not.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.running = false;

	}

	/**
	 * Starts the clock. When `autoStart` is set to `true`, the method is automatically
	 * called by the class.
	 */
	start() {

		this.startTime = performance.now();

		this.oldTime = this.startTime;
		this.elapsedTime = 0;
		this.running = true;

	}

	/**
	 * Stops the clock.
	 */
	stop() {

		this.getElapsedTime();
		this.running = false;
		this.autoStart = false;

	}

	/**
	 * Returns the elapsed time in seconds.
	 *
	 * @return {number} The elapsed time.
	 */
	getElapsedTime() {

		this.getDelta();
		return this.elapsedTime;

	}

	/**
	 * Returns the delta time in seconds.
	 *
	 * @return {number} The delta time.
	 */
	getDelta() {

		let diff = 0;

		if ( this.autoStart && ! this.running ) {

			this.start();
			return 0;

		}

		if ( this.running ) {

			const newTime = performance.now();

			diff = ( newTime - this.oldTime ) / 1000;
			this.oldTime = newTime;

			this.elapsedTime += diff;

		}

		return diff;

	}

}

const _position$1 = /*@__PURE__*/ new Vector3();
const _quaternion$1 = /*@__PURE__*/ new Quaternion();
const _scale$1 = /*@__PURE__*/ new Vector3();

const _forward = /*@__PURE__*/ new Vector3();
const _up = /*@__PURE__*/ new Vector3();

/**
 * The class represents a virtual listener of the all positional and non-positional audio effects
 * in the scene. A three.js application usually creates a single listener. It is a mandatory
 * constructor parameter for audios entities like {@link Audio} and {@link PositionalAudio}.
 *
 * In most cases, the listener object is a child of the camera. So the 3D transformation of the
 * camera represents the 3D transformation of the listener.
 *
 * @augments Object3D
 */
class AudioListener extends Object3D {

	/**
	 * Constructs a new audio listener.
	 */
	constructor() {

		super();

		this.type = 'AudioListener';

		/**
		 * The native audio context.
		 *
		 * @type {AudioContext}
		 * @readonly
		 */
		this.context = AudioContext.getContext();

		/**
		 * The gain node used for volume control.
		 *
		 * @type {GainNode}
		 * @readonly
		 */
		this.gain = this.context.createGain();
		this.gain.connect( this.context.destination );

		/**
		 * An optional filter.
		 *
		 * Defined via {@link AudioListener#setFilter}.
		 *
		 * @type {?AudioNode}
		 * @default null
		 * @readonly
		 */
		this.filter = null;

		/**
		 * Time delta values required for `linearRampToValueAtTime()` usage.
		 *
		 * @type {number}
		 * @default 0
		 * @readonly
		 */
		this.timeDelta = 0;

		// private

		this._clock = new Clock();

	}

	/**
	 * Returns the listener's input node.
	 *
	 * This method is used by other audio nodes to connect to this listener.
	 *
	 * @return {GainNode} The input node.
	 */
	getInput() {

		return this.gain;

	}

	/**
	 * Removes the current filter from this listener.
	 *
	 * @return {AudioListener} A reference to this listener.
	 */
	removeFilter() {

		if ( this.filter !== null ) {

			this.gain.disconnect( this.filter );
			this.filter.disconnect( this.context.destination );
			this.gain.connect( this.context.destination );
			this.filter = null;

		}

		return this;

	}

	/**
	 * Returns the current set filter.
	 *
	 * @return {?AudioNode} The filter.
	 */
	getFilter() {

		return this.filter;

	}

	/**
	 * Sets the given filter to this listener.
	 *
	 * @param {AudioNode} value - The filter to set.
	 * @return {AudioListener} A reference to this listener.
	 */
	setFilter( value ) {

		if ( this.filter !== null ) {

			this.gain.disconnect( this.filter );
			this.filter.disconnect( this.context.destination );

		} else {

			this.gain.disconnect( this.context.destination );

		}

		this.filter = value;
		this.gain.connect( this.filter );
		this.filter.connect( this.context.destination );

		return this;

	}

	/**
	 * Returns the applications master volume.
	 *
	 * @return {number} The master volume.
	 */
	getMasterVolume() {

		return this.gain.gain.value;

	}

	/**
	 * Sets the applications master volume. This volume setting affects
	 * all audio nodes in the scene.
	 *
	 * @param {number} value - The master volume to set.
	 * @return {AudioListener} A reference to this listener.
	 */
	setMasterVolume( value ) {

		this.gain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );

		return this;

	}

	updateMatrixWorld( force ) {

		super.updateMatrixWorld( force );

		const listener = this.context.listener;

		this.timeDelta = this._clock.getDelta();

		this.matrixWorld.decompose( _position$1, _quaternion$1, _scale$1 );

		// the initial forward and up directions must be orthogonal
		_forward.set( 0, 0, -1 ).applyQuaternion( _quaternion$1 );
		_up.set( 0, 1, 0 ).applyQuaternion( _quaternion$1 );

		if ( listener.positionX ) {

			// code path for Chrome (see #14393)

			const endTime = this.context.currentTime + this.timeDelta;

			listener.positionX.linearRampToValueAtTime( _position$1.x, endTime );
			listener.positionY.linearRampToValueAtTime( _position$1.y, endTime );
			listener.positionZ.linearRampToValueAtTime( _position$1.z, endTime );
			listener.forwardX.linearRampToValueAtTime( _forward.x, endTime );
			listener.forwardY.linearRampToValueAtTime( _forward.y, endTime );
			listener.forwardZ.linearRampToValueAtTime( _forward.z, endTime );
			listener.upX.linearRampToValueAtTime( _up.x, endTime );
			listener.upY.linearRampToValueAtTime( _up.y, endTime );
			listener.upZ.linearRampToValueAtTime( _up.z, endTime );

		} else {

			listener.setPosition( _position$1.x, _position$1.y, _position$1.z );
			listener.setOrientation( _forward.x, _forward.y, _forward.z, _up.x, _up.y, _up.z );

		}

	}

}

/**
 * Represents a non-positional ( global ) audio object.
 *
 * This and related audio modules make use of the [Web Audio API]{@link https://www.w3.org/TR/webaudio-1.1/}.
 *
 * ```js
 * // create an AudioListener and add it to the camera
 * const listener = new THREE.AudioListener();
 * camera.add( listener );
 *
 * // create a global audio source
 * const sound = new THREE.Audio( listener );
 *
 * // load a sound and set it as the Audio object's buffer
 * const audioLoader = new THREE.AudioLoader();
 * audioLoader.load( 'sounds/ambient.ogg', function( buffer ) {
 * 	sound.setBuffer( buffer );
 * 	sound.setLoop( true );
 * 	sound.setVolume( 0.5 );
 * 	sound.play();
 * });
 * ```
 *
 * @augments Object3D
 */
class Audio extends Object3D {

	/**
	 * Constructs a new audio.
	 *
	 * @param {AudioListener} listener - The global audio listener.
	 */
	constructor( listener ) {

		super();

		this.type = 'Audio';

		/**
		 * The global audio listener.
		 *
		 * @type {AudioListener}
		 * @readonly
		 */
		this.listener = listener;

		/**
		 * The audio context.
		 *
		 * @type {AudioContext}
		 * @readonly
		 */
		this.context = listener.context;

		/**
		 * The gain node used for volume control.
		 *
		 * @type {GainNode}
		 * @readonly
		 */
		this.gain = this.context.createGain();
		this.gain.connect( listener.getInput() );

		/**
		 * Whether to start playback automatically or not.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.autoplay = false;

		/**
		 * A reference to an audio buffer.
		 *
		 * Defined via {@link Audio#setBuffer}.
		 *
		 * @type {?AudioBuffer}
		 * @default null
		 * @readonly
		 */
		this.buffer = null;

		/**
		 * Modify pitch, measured in cents. +/- 100 is a semitone.
		 * +/- 1200 is an octave.
		 *
		 * Defined via {@link Audio#setDetune}.
		 *
		 * @type {number}
		 * @default 0
		 * @readonly
		 */
		this.detune = 0;

		/**
		 * Whether the audio should loop or not.
		 *
		 * Defined via {@link Audio#setLoop}.
		 *
		 * @type {boolean}
		 * @default false
		 * @readonly
		 */
		this.loop = false;

		/**
		 * Defines where in the audio buffer the replay should
		 * start, in seconds.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.loopStart = 0;

		/**
		 * Defines where in the audio buffer the replay should
		 * stop, in seconds.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.loopEnd = 0;

		/**
		 * An offset to the time within the audio buffer the playback
		 * should begin, in seconds.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.offset = 0;

		/**
		 * Overrides the default duration of the audio.
		 *
		 * @type {undefined|number}
		 * @default undefined
		 */
		this.duration = undefined;

		/**
		 * The playback speed.
		 *
		 * Defined via {@link Audio#setPlaybackRate}.
		 *
		 * @type {number}
		 * @readonly
		 * @default 1
		 */
		this.playbackRate = 1;

		/**
		 * Indicates whether the audio is playing or not.
		 *
		 * This flag will be automatically set when using {@link Audio#play},
		 * {@link Audio#pause}, {@link Audio#stop}.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default false
		 */
		this.isPlaying = false;

		/**
		 * Indicates whether the audio playback can be controlled
		 * with method like {@link Audio#play} or {@link Audio#pause}.
		 *
		 * This flag will be automatically set when audio sources are
		 * defined.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.hasPlaybackControl = true;

		/**
		 * Holds a reference to the current audio source.
		 *
		 * The property is automatically by one of the `set*()` methods.
		 *
		 * @type {?AudioNode}
		 * @readonly
		 * @default null
		 */
		this.source = null;

		/**
		 * Defines the source type.
		 *
		 * The property is automatically by one of the `set*()` methods.
		 *
		 * @type {('empty'|'audioNode'|'mediaNode'|'mediaStreamNode'|'buffer')}
		 * @readonly
		 * @default 'empty'
		 */
		this.sourceType = 'empty';

		this._startedAt = 0;
		this._progress = 0;
		this._connected = false;

		/**
		 * Can be used to apply a variety of low-order filters to create
		 * more complex sound effects e.g. via `BiquadFilterNode`.
		 *
		 * The property is automatically set by {@link Audio#setFilters}.
		 *
		 * @type {Array<AudioNode>}
		 * @readonly
		 */
		this.filters = [];

	}

	/**
	 * Returns the output audio node.
	 *
	 * @return {GainNode} The output node.
	 */
	getOutput() {

		return this.gain;

	}

	/**
	 * Sets the given audio node as the source of this instance.
	 *
	 * {@link Audio#sourceType} is set to `audioNode` and {@link Audio#hasPlaybackControl} to `false`.
	 *
	 * @param {AudioNode} audioNode - The audio node like an instance of `OscillatorNode`.
	 * @return {Audio} A reference to this instance.
	 */
	setNodeSource( audioNode ) {

		this.hasPlaybackControl = false;
		this.sourceType = 'audioNode';
		this.source = audioNode;
		this.connect();

		return this;

	}

	/**
	 * Sets the given media element as the source of this instance.
	 *
	 * {@link Audio#sourceType} is set to `mediaNode` and {@link Audio#hasPlaybackControl} to `false`.
	 *
	 * @param {HTMLMediaElement} mediaElement - The media element.
	 * @return {Audio} A reference to this instance.
	 */
	setMediaElementSource( mediaElement ) {

		this.hasPlaybackControl = false;
		this.sourceType = 'mediaNode';
		this.source = this.context.createMediaElementSource( mediaElement );
		this.connect();

		return this;

	}

	/**
	 * Sets the given media stream as the source of this instance.
	 *
	 * {@link Audio#sourceType} is set to `mediaStreamNode` and {@link Audio#hasPlaybackControl} to `false`.
	 *
	 * @param {MediaStream} mediaStream - The media stream.
	 * @return {Audio} A reference to this instance.
	 */
	setMediaStreamSource( mediaStream ) {

		this.hasPlaybackControl = false;
		this.sourceType = 'mediaStreamNode';
		this.source = this.context.createMediaStreamSource( mediaStream );
		this.connect();

		return this;

	}

	/**
	 * Sets the given audio buffer as the source of this instance.
	 *
	 * {@link Audio#sourceType} is set to `buffer` and {@link Audio#hasPlaybackControl} to `true`.
	 *
	 * @param {AudioBuffer} audioBuffer - The audio buffer.
	 * @return {Audio} A reference to this instance.
	 */
	setBuffer( audioBuffer ) {

		this.buffer = audioBuffer;
		this.sourceType = 'buffer';

		if ( this.autoplay ) this.play();

		return this;

	}

	/**
	 * Starts the playback of the audio.
	 *
	 * Can only be used with compatible audio sources that allow playback control.
	 *
	 * @param {number} [delay=0] - The delay, in seconds, at which the audio should start playing.
	 * @return {Audio|undefined} A reference to this instance.
	 */
	play( delay = 0 ) {

		if ( this.isPlaying === true ) {

			console.warn( 'THREE.Audio: Audio is already playing.' );
			return;

		}

		if ( this.hasPlaybackControl === false ) {

			console.warn( 'THREE.Audio: this Audio has no playback control.' );
			return;

		}

		this._startedAt = this.context.currentTime + delay;

		const source = this.context.createBufferSource();
		source.buffer = this.buffer;
		source.loop = this.loop;
		source.loopStart = this.loopStart;
		source.loopEnd = this.loopEnd;
		source.onended = this.onEnded.bind( this );
		source.start( this._startedAt, this._progress + this.offset, this.duration );

		this.isPlaying = true;

		this.source = source;

		this.setDetune( this.detune );
		this.setPlaybackRate( this.playbackRate );

		return this.connect();

	}

	/**
	 * Pauses the playback of the audio.
	 *
	 * Can only be used with compatible audio sources that allow playback control.
	 *
	 * @return {Audio|undefined} A reference to this instance.
	 */
	pause() {

		if ( this.hasPlaybackControl === false ) {

			console.warn( 'THREE.Audio: this Audio has no playback control.' );
			return;

		}

		if ( this.isPlaying === true ) {

			// update current progress

			this._progress += Math.max( this.context.currentTime - this._startedAt, 0 ) * this.playbackRate;

			if ( this.loop === true ) {

				// ensure _progress does not exceed duration with looped audios

				this._progress = this._progress % ( this.duration || this.buffer.duration );

			}

			this.source.stop();
			this.source.onended = null;

			this.isPlaying = false;

		}

		return this;

	}

	/**
	 * Stops the playback of the audio.
	 *
	 * Can only be used with compatible audio sources that allow playback control.
	 *
	 * @param {number} [delay=0] - The delay, in seconds, at which the audio should stop playing.
	 * @return {Audio|undefined} A reference to this instance.
	 */
	stop( delay = 0 ) {

		if ( this.hasPlaybackControl === false ) {

			console.warn( 'THREE.Audio: this Audio has no playback control.' );
			return;

		}

		this._progress = 0;

		if ( this.source !== null ) {

			this.source.stop( this.context.currentTime + delay );
			this.source.onended = null;

		}

		this.isPlaying = false;

		return this;

	}

	/**
	 * Connects to the audio source. This is used internally on
	 * initialisation and when setting / removing filters.
	 *
	 * @return {Audio} A reference to this instance.
	 */
	connect() {

		if ( this.filters.length > 0 ) {

			this.source.connect( this.filters[ 0 ] );

			for ( let i = 1, l = this.filters.length; i < l; i ++ ) {

				this.filters[ i - 1 ].connect( this.filters[ i ] );

			}

			this.filters[ this.filters.length - 1 ].connect( this.getOutput() );

		} else {

			this.source.connect( this.getOutput() );

		}

		this._connected = true;

		return this;

	}

	/**
	 * Disconnects to the audio source. This is used internally on
	 * initialisation and when setting / removing filters.
	 *
	 * @return {Audio|undefined} A reference to this instance.
	 */
	disconnect() {

		if ( this._connected === false ) {

			return;

		}

		if ( this.filters.length > 0 ) {

			this.source.disconnect( this.filters[ 0 ] );

			for ( let i = 1, l = this.filters.length; i < l; i ++ ) {

				this.filters[ i - 1 ].disconnect( this.filters[ i ] );

			}

			this.filters[ this.filters.length - 1 ].disconnect( this.getOutput() );

		} else {

			this.source.disconnect( this.getOutput() );

		}

		this._connected = false;

		return this;

	}

	/**
	 * Returns the current set filters.
	 *
	 * @return {Array<AudioNode>} The list of filters.
	 */
	getFilters() {

		return this.filters;

	}

	/**
	 * Sets an array of filters and connects them with the audio source.
	 *
	 * @param {Array<AudioNode>} [value] - A list of filters.
	 * @return {Audio} A reference to this instance.
	 */
	setFilters( value ) {

		if ( ! value ) value = [];

		if ( this._connected === true ) {

			this.disconnect();
			this.filters = value.slice();
			this.connect();

		} else {

			this.filters = value.slice();

		}

		return this;

	}

	/**
	 * Defines the detuning of oscillation in cents.
	 *
	 * @param {number} value - The detuning of oscillation in cents.
	 * @return {Audio} A reference to this instance.
	 */
	setDetune( value ) {

		this.detune = value;

		if ( this.isPlaying === true && this.source.detune !== undefined ) {

			this.source.detune.setTargetAtTime( this.detune, this.context.currentTime, 0.01 );

		}

		return this;

	}

	/**
	 * Returns the detuning of oscillation in cents.
	 *
	 * @return {number} The detuning of oscillation in cents.
	 */
	getDetune() {

		return this.detune;

	}

	/**
	 * Returns the first filter in the list of filters.
	 *
	 * @return {AudioNode|undefined} The first filter in the list of filters.
	 */
	getFilter() {

		return this.getFilters()[ 0 ];

	}

	/**
	 * Applies a single filter node to the audio.
	 *
	 * @param {AudioNode} [filter] - The filter to set.
	 * @return {Audio} A reference to this instance.
	 */
	setFilter( filter ) {

		return this.setFilters( filter ? [ filter ] : [] );

	}

	/**
	 * Sets the playback rate.
	 *
	 * Can only be used with compatible audio sources that allow playback control.
	 *
	 * @param {number} [value] - The playback rate to set.
	 * @return {Audio|undefined} A reference to this instance.
	 */
	setPlaybackRate( value ) {

		if ( this.hasPlaybackControl === false ) {

			console.warn( 'THREE.Audio: this Audio has no playback control.' );
			return;

		}

		this.playbackRate = value;

		if ( this.isPlaying === true ) {

			this.source.playbackRate.setTargetAtTime( this.playbackRate, this.context.currentTime, 0.01 );

		}

		return this;

	}

	/**
	 * Returns the current playback rate.

	 * @return {number} The playback rate.
	 */
	getPlaybackRate() {

		return this.playbackRate;

	}

	/**
	 * Automatically called when playback finished.
	 */
	onEnded() {

		this.isPlaying = false;
		this._progress = 0;

	}

	/**
	 * Returns the loop flag.
	 *
	 * Can only be used with compatible audio sources that allow playback control.
	 *
	 * @return {boolean} Whether the audio should loop or not.
	 */
	getLoop() {

		if ( this.hasPlaybackControl === false ) {

			console.warn( 'THREE.Audio: this Audio has no playback control.' );
			return false;

		}

		return this.loop;

	}

	/**
	 * Sets the loop flag.
	 *
	 * Can only be used with compatible audio sources that allow playback control.
	 *
	 * @param {boolean} value - Whether the audio should loop or not.
	 * @return {Audio|undefined} A reference to this instance.
	 */
	setLoop( value ) {

		if ( this.hasPlaybackControl === false ) {

			console.warn( 'THREE.Audio: this Audio has no playback control.' );
			return;

		}

		this.loop = value;

		if ( this.isPlaying === true ) {

			this.source.loop = this.loop;

		}

		return this;

	}

	/**
	 * Sets the loop start value which defines where in the audio buffer the replay should
	 * start, in seconds.
	 *
	 * @param {number} value - The loop start value.
	 * @return {Audio} A reference to this instance.
	 */
	setLoopStart( value ) {

		this.loopStart = value;

		return this;

	}

	/**
	 * Sets the loop end value which defines where in the audio buffer the replay should
	 * stop, in seconds.
	 *
	 * @param {number} value - The loop end value.
	 * @return {Audio} A reference to this instance.
	 */
	setLoopEnd( value ) {

		this.loopEnd = value;

		return this;

	}

	/**
	 * Returns the volume.
	 *
	 * @return {number} The volume.
	 */
	getVolume() {

		return this.gain.gain.value;

	}

	/**
	 * Sets the volume.
	 *
	 * @param {number} value - The volume to set.
	 * @return {Audio} A reference to this instance.
	 */
	setVolume( value ) {

		this.gain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );

		return this;

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		if ( source.sourceType !== 'buffer' ) {

			console.warn( 'THREE.Audio: Audio source type cannot be copied.' );

			return this;

		}

		this.autoplay = source.autoplay;

		this.buffer = source.buffer;
		this.detune = source.detune;
		this.loop = source.loop;
		this.loopStart = source.loopStart;
		this.loopEnd = source.loopEnd;
		this.offset = source.offset;
		this.duration = source.duration;
		this.playbackRate = source.playbackRate;
		this.hasPlaybackControl = source.hasPlaybackControl;
		this.sourceType = source.sourceType;

		this.filters = source.filters.slice();

		return this;

	}

	clone( recursive ) {

		return new this.constructor( this.listener ).copy( this, recursive );

	}

}

const _position = /*@__PURE__*/ new Vector3();
const _quaternion = /*@__PURE__*/ new Quaternion();
const _scale = /*@__PURE__*/ new Vector3();
const _orientation = /*@__PURE__*/ new Vector3();

/**
 * Represents a positional audio object.
 *
 * ```js
 * // create an AudioListener and add it to the camera
 * const listener = new THREE.AudioListener();
 * camera.add( listener );
 *
 * // create the PositionalAudio object (passing in the listener)
 * const sound = new THREE.PositionalAudio( listener );
 *
 * // load a sound and set it as the PositionalAudio object's buffer
 * const audioLoader = new THREE.AudioLoader();
 * audioLoader.load( 'sounds/song.ogg', function( buffer ) {
 * 	sound.setBuffer( buffer );
 * 	sound.setRefDistance( 20 );
 * 	sound.play();
 * });
 *
 * // create an object for the sound to play from
 * const sphere = new THREE.SphereGeometry( 20, 32, 16 );
 * const material = new THREE.MeshPhongMaterial( { color: 0xff2200 } );
 * const mesh = new THREE.Mesh( sphere, material );
 * scene.add( mesh );
 *
 * // finally add the sound to the mesh
 * mesh.add( sound );
 *
 * @augments Audio
 */
class PositionalAudio extends Audio {

	/**
	 * Constructs a positional audio.
	 *
	 * @param {AudioListener} listener - The global audio listener.
	 */
	constructor( listener ) {

		super( listener );

		/**
		 * The panner node represents the location, direction, and behavior of an audio
		 * source in 3D space.
		 *
		 * @type {PannerNode}
		 * @readonly
		 */
		this.panner = this.context.createPanner();
		this.panner.panningModel = 'HRTF';
		this.panner.connect( this.gain );

	}

	connect() {

		super.connect();

		this.panner.connect( this.gain );

		return this;

	}

	disconnect() {

		super.disconnect();

		this.panner.disconnect( this.gain );

		return this;

	}

	getOutput() {

		return this.panner;

	}

	/**
	 * Returns the current reference distance.
	 *
	 * @return {number} The reference distance.
	 */
	getRefDistance() {

		return this.panner.refDistance;

	}

	/**
	 * Defines the reference distance for reducing volume as the audio source moves
	 * further from the listener – i.e. the distance at which the volume reduction
	 * starts taking effect.
	 *
	 * @param {number} value - The reference distance to set.
	 * @return {PositionalAudio} A reference to this instance.
	 */
	setRefDistance( value ) {

		this.panner.refDistance = value;

		return this;

	}

	/**
	 * Returns the current rolloff factor.
	 *
	 * @return {number} The rolloff factor.
	 */
	getRolloffFactor() {

		return this.panner.rolloffFactor;

	}

	/**
	 * Defines how quickly the volume is reduced as the source moves away from the listener.
	 *
	 * @param {number} value - The rolloff factor.
	 * @return {PositionalAudio} A reference to this instance.
	 */
	setRolloffFactor( value ) {

		this.panner.rolloffFactor = value;

		return this;

	}

	/**
	 * Returns the current distance model.
	 *
	 * @return {('linear'|'inverse'|'exponential')} The distance model.
	 */
	getDistanceModel() {

		return this.panner.distanceModel;

	}

	/**
	 * Defines which algorithm to use to reduce the volume of the audio source
	 * as it moves away from the listener.
	 *
	 * Read [the spec]{@link https://www.w3.org/TR/webaudio-1.1/#enumdef-distancemodeltype}
	 * for more details.
	 *
	 * @param {('linear'|'inverse'|'exponential')} value - The distance model to set.
	 * @return {PositionalAudio} A reference to this instance.
	 */
	setDistanceModel( value ) {

		this.panner.distanceModel = value;

		return this;

	}

	/**
	 * Returns the current max distance.
	 *
	 * @return {number} The max distance.
	 */
	getMaxDistance() {

		return this.panner.maxDistance;

	}

	/**
	 * Defines the maximum distance between the audio source and the listener,
	 * after which the volume is not reduced any further.
	 *
	 * This value is used only by the `linear` distance model.
	 *
	 * @param {number} value - The max distance.
	 * @return {PositionalAudio} A reference to this instance.
	 */
	setMaxDistance( value ) {

		this.panner.maxDistance = value;

		return this;

	}

	/**
	 * Sets the directional cone in which the audio can be listened.
	 *
	 * @param {number} coneInnerAngle - An angle, in degrees, of a cone inside of which there will be no volume reduction.
	 * @param {number} coneOuterAngle - An angle, in degrees, of a cone outside of which the volume will be reduced by a constant value, defined by the `coneOuterGain` parameter.
	 * @param {number} coneOuterGain - The amount of volume reduction outside the cone defined by the `coneOuterAngle`. When set to `0`, no sound can be heard.
	 * @return {PositionalAudio} A reference to this instance.
	 */
	setDirectionalCone( coneInnerAngle, coneOuterAngle, coneOuterGain ) {

		this.panner.coneInnerAngle = coneInnerAngle;
		this.panner.coneOuterAngle = coneOuterAngle;
		this.panner.coneOuterGain = coneOuterGain;

		return this;

	}

	updateMatrixWorld( force ) {

		super.updateMatrixWorld( force );

		if ( this.hasPlaybackControl === true && this.isPlaying === false ) return;

		this.matrixWorld.decompose( _position, _quaternion, _scale );

		_orientation.set( 0, 0, 1 ).applyQuaternion( _quaternion );

		const panner = this.panner;

		if ( panner.positionX ) {

			// code path for Chrome and Firefox (see #14393)

			const endTime = this.context.currentTime + this.listener.timeDelta;

			panner.positionX.linearRampToValueAtTime( _position.x, endTime );
			panner.positionY.linearRampToValueAtTime( _position.y, endTime );
			panner.positionZ.linearRampToValueAtTime( _position.z, endTime );
			panner.orientationX.linearRampToValueAtTime( _orientation.x, endTime );
			panner.orientationY.linearRampToValueAtTime( _orientation.y, endTime );
			panner.orientationZ.linearRampToValueAtTime( _orientation.z, endTime );

		} else {

			panner.setPosition( _position.x, _position.y, _position.z );
			panner.setOrientation( _orientation.x, _orientation.y, _orientation.z );

		}

	}

}

/**
 * This class can be used to analyse audio data.
 *
 * ```js
 * // create an AudioListener and add it to the camera
 * const listener = new THREE.AudioListener();
 * camera.add( listener );
 *
 * // create an Audio source
 * const sound = new THREE.Audio( listener );
 *
 * // load a sound and set it as the Audio object's buffer
 * const audioLoader = new THREE.AudioLoader();
 * audioLoader.load( 'sounds/ambient.ogg', function( buffer ) {
 * 	sound.setBuffer( buffer );
 * 	sound.setLoop(true);
 * 	sound.setVolume(0.5);
 * 	sound.play();
 * });
 *
 * // create an AudioAnalyser, passing in the sound and desired fftSize
 * const analyser = new THREE.AudioAnalyser( sound, 32 );
 *
 * // get the average frequency of the sound
 * const data = analyser.getAverageFrequency();
 * ```
 */
class AudioAnalyser {

	/**
	 * Constructs a new audio analyzer.
	 *
	 * @param {Audio} audio - The audio to analyze.
	 * @param {number} [fftSize=2048] - The window size in samples that is used when performing a Fast Fourier Transform (FFT) to get frequency domain data.
	 */
	constructor( audio, fftSize = 2048 ) {

		/**
		 * The global audio listener.
		 *
		 * @type {AnalyserNode}
		 */
		this.analyser = audio.context.createAnalyser();
		this.analyser.fftSize = fftSize;

		/**
		 * Holds the analyzed data.
		 *
		 * @type {Uint8Array}
		 */
		this.data = new Uint8Array( this.analyser.frequencyBinCount );

		audio.getOutput().connect( this.analyser );

	}

	/**
	 * Returns an array with frequency data of the audio.
	 *
	 * Each item in the array represents the decibel value for a specific frequency.
	 * The frequencies are spread linearly from 0 to 1/2 of the sample rate.
	 * For example, for 48000 sample rate, the last item of the array will represent
	 * the decibel value for 24000 Hz.
	 *
	 * @return {Uint8Array} The frequency data.
	 */
	getFrequencyData() {

		this.analyser.getByteFrequencyData( this.data );

		return this.data;

	}

	/**
	 * Returns the average of the frequencies returned by {@link AudioAnalyser#getFrequencyData}.
	 *
	 * @return {number} The average frequency.
	 */
	getAverageFrequency() {

		let value = 0;
		const data = this.getFrequencyData();

		for ( let i = 0; i < data.length; i ++ ) {

			value += data[ i ];

		}

		return value / data.length;

	}

}

/**
 * Buffered scene graph property that allows weighted accumulation; used internally.
 */
class PropertyMixer {

	/**
	 * Constructs a new property mixer.
	 *
	 * @param {PropertyBinding} binding - The property binding.
	 * @param {string} typeName - The keyframe track type name.
	 * @param {number} valueSize - The keyframe track value size.
	 */
	constructor( binding, typeName, valueSize ) {

		/**
		 * The property binding.
		 *
		 * @type {PropertyBinding}
		 */
		this.binding = binding;

		/**
		 * The keyframe track value size.
		 *
		 * @type {number}
		 */
		this.valueSize = valueSize;

		let mixFunction,
			mixFunctionAdditive,
			setIdentity;

		// buffer layout: [ incoming | accu0 | accu1 | orig | addAccu | (optional work) ]
		//
		// interpolators can use .buffer as their .result
		// the data then goes to 'incoming'
		//
		// 'accu0' and 'accu1' are used frame-interleaved for
		// the cumulative result and are compared to detect
		// changes
		//
		// 'orig' stores the original state of the property
		//
		// 'add' is used for additive cumulative results
		//
		// 'work' is optional and is only present for quaternion types. It is used
		// to store intermediate quaternion multiplication results

		switch ( typeName ) {

			case 'quaternion':
				mixFunction = this._slerp;
				mixFunctionAdditive = this._slerpAdditive;
				setIdentity = this._setAdditiveIdentityQuaternion;

				this.buffer = new Float64Array( valueSize * 6 );
				this._workIndex = 5;
				break;

			case 'string':
			case 'bool':
				mixFunction = this._select;

				// Use the regular mix function and for additive on these types,
				// additive is not relevant for non-numeric types
				mixFunctionAdditive = this._select;

				setIdentity = this._setAdditiveIdentityOther;

				this.buffer = new Array( valueSize * 5 );
				break;

			default:
				mixFunction = this._lerp;
				mixFunctionAdditive = this._lerpAdditive;
				setIdentity = this._setAdditiveIdentityNumeric;

				this.buffer = new Float64Array( valueSize * 5 );

		}

		this._mixBufferRegion = mixFunction;
		this._mixBufferRegionAdditive = mixFunctionAdditive;
		this._setIdentity = setIdentity;
		this._origIndex = 3;
		this._addIndex = 4;

		/**
		 * TODO
		 *
		 * @type {number}
		 * @default 0
		 */
		this.cumulativeWeight = 0;

		/**
		 * TODO
		 *
		 * @type {number}
		 * @default 0
		 */
		this.cumulativeWeightAdditive = 0;

		/**
		 * TODO
		 *
		 * @type {number}
		 * @default 0
		 */
		this.useCount = 0;

		/**
		 * TODO
		 *
		 * @type {number}
		 * @default 0
		 */
		this.referenceCount = 0;

	}

	/**
	 * Accumulates data in the `incoming` region into `accu<i>`.
	 *
	 * @param {number} accuIndex - The accumulation index.
	 * @param {number} weight - The weight.
	 */
	accumulate( accuIndex, weight ) {

		// note: happily accumulating nothing when weight = 0, the caller knows
		// the weight and shouldn't have made the call in the first place

		const buffer = this.buffer,
			stride = this.valueSize,
			offset = accuIndex * stride + stride;

		let currentWeight = this.cumulativeWeight;

		if ( currentWeight === 0 ) {

			// accuN := incoming * weight

			for ( let i = 0; i !== stride; ++ i ) {

				buffer[ offset + i ] = buffer[ i ];

			}

			currentWeight = weight;

		} else {

			// accuN := accuN + incoming * weight

			currentWeight += weight;
			const mix = weight / currentWeight;
			this._mixBufferRegion( buffer, offset, 0, mix, stride );

		}

		this.cumulativeWeight = currentWeight;

	}

	/**
	 * Accumulates data in the `incoming` region into `add`.
	 *
	 * @param {number} weight - The weight.
	 */
	accumulateAdditive( weight ) {

		const buffer = this.buffer,
			stride = this.valueSize,
			offset = stride * this._addIndex;

		if ( this.cumulativeWeightAdditive === 0 ) {

			// add = identity

			this._setIdentity();

		}

		// add := add + incoming * weight

		this._mixBufferRegionAdditive( buffer, offset, 0, weight, stride );
		this.cumulativeWeightAdditive += weight;

	}

	/**
	 * Applies the state of `accu<i>` to the binding when accus differ.
	 *
	 * @param {number} accuIndex - The accumulation index.
	 */
	apply( accuIndex ) {

		const stride = this.valueSize,
			buffer = this.buffer,
			offset = accuIndex * stride + stride,

			weight = this.cumulativeWeight,
			weightAdditive = this.cumulativeWeightAdditive,

			binding = this.binding;

		this.cumulativeWeight = 0;
		this.cumulativeWeightAdditive = 0;

		if ( weight < 1 ) {

			// accuN := accuN + original * ( 1 - cumulativeWeight )

			const originalValueOffset = stride * this._origIndex;

			this._mixBufferRegion(
				buffer, offset, originalValueOffset, 1 - weight, stride );

		}

		if ( weightAdditive > 0 ) {

			// accuN := accuN + additive accuN

			this._mixBufferRegionAdditive( buffer, offset, this._addIndex * stride, 1, stride );

		}

		for ( let i = stride, e = stride + stride; i !== e; ++ i ) {

			if ( buffer[ i ] !== buffer[ i + stride ] ) {

				// value has changed -> update scene graph

				binding.setValue( buffer, offset );
				break;

			}

		}

	}


	/**
	 * Remembers the state of the bound property and copy it to both accus.
	 */
	saveOriginalState() {

		const binding = this.binding;

		const buffer = this.buffer,
			stride = this.valueSize,

			originalValueOffset = stride * this._origIndex;

		binding.getValue( buffer, originalValueOffset );

		// accu[0..1] := orig -- initially detect changes against the original
		for ( let i = stride, e = originalValueOffset; i !== e; ++ i ) {

			buffer[ i ] = buffer[ originalValueOffset + ( i % stride ) ];

		}

		// Add to identity for additive
		this._setIdentity();

		this.cumulativeWeight = 0;
		this.cumulativeWeightAdditive = 0;

	}

	/**
	 * Applies the state previously taken via {@link PropertyMixer#saveOriginalState} to the binding.
	 */
	restoreOriginalState() {

		const originalValueOffset = this.valueSize * 3;
		this.binding.setValue( this.buffer, originalValueOffset );

	}

	// internals

	_setAdditiveIdentityNumeric() {

		const startIndex = this._addIndex * this.valueSize;
		const endIndex = startIndex + this.valueSize;

		for ( let i = startIndex; i < endIndex; i ++ ) {

			this.buffer[ i ] = 0;

		}

	}

	_setAdditiveIdentityQuaternion() {

		this._setAdditiveIdentityNumeric();
		this.buffer[ this._addIndex * this.valueSize + 3 ] = 1;

	}

	_setAdditiveIdentityOther() {

		const startIndex = this._origIndex * this.valueSize;
		const targetIndex = this._addIndex * this.valueSize;

		for ( let i = 0; i < this.valueSize; i ++ ) {

			this.buffer[ targetIndex + i ] = this.buffer[ startIndex + i ];

		}

	}


	// mix functions

	_select( buffer, dstOffset, srcOffset, t, stride ) {

		if ( t >= 0.5 ) {

			for ( let i = 0; i !== stride; ++ i ) {

				buffer[ dstOffset + i ] = buffer[ srcOffset + i ];

			}

		}

	}

	_slerp( buffer, dstOffset, srcOffset, t ) {

		Quaternion.slerpFlat( buffer, dstOffset, buffer, dstOffset, buffer, srcOffset, t );

	}

	_slerpAdditive( buffer, dstOffset, srcOffset, t, stride ) {

		const workOffset = this._workIndex * stride;

		// Store result in intermediate buffer offset
		Quaternion.multiplyQuaternionsFlat( buffer, workOffset, buffer, dstOffset, buffer, srcOffset );

		// Slerp to the intermediate result
		Quaternion.slerpFlat( buffer, dstOffset, buffer, dstOffset, buffer, workOffset, t );

	}

	_lerp( buffer, dstOffset, srcOffset, t, stride ) {

		const s = 1 - t;

		for ( let i = 0; i !== stride; ++ i ) {

			const j = dstOffset + i;

			buffer[ j ] = buffer[ j ] * s + buffer[ srcOffset + i ] * t;

		}

	}

	_lerpAdditive( buffer, dstOffset, srcOffset, t, stride ) {

		for ( let i = 0; i !== stride; ++ i ) {

			const j = dstOffset + i;

			buffer[ j ] = buffer[ j ] + buffer[ srcOffset + i ] * t;

		}

	}

}

// Characters [].:/ are reserved for track binding syntax.
const _RESERVED_CHARS_RE = '\\[\\]\\.:\\/';
const _reservedRe = new RegExp( '[' + _RESERVED_CHARS_RE + ']', 'g' );

// Attempts to allow node names from any language. ES5's `\w` regexp matches
// only latin characters, and the unicode \p{L} is not yet supported. So
// instead, we exclude reserved characters and match everything else.
const _wordChar = '[^' + _RESERVED_CHARS_RE + ']';
const _wordCharOrDot = '[^' + _RESERVED_CHARS_RE.replace( '\\.', '' ) + ']';

// Parent directories, delimited by '/' or ':'. Currently unused, but must
// be matched to parse the rest of the track name.
const _directoryRe = /*@__PURE__*/ /((?:WC+[\/:])*)/.source.replace( 'WC', _wordChar );

// Target node. May contain word characters (a-zA-Z0-9_) and '.' or '-'.
const _nodeRe = /*@__PURE__*/ /(WCOD+)?/.source.replace( 'WCOD', _wordCharOrDot );

// Object on target node, and accessor. May not contain reserved
// characters. Accessor may contain any character except closing bracket.
const _objectRe = /*@__PURE__*/ /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace( 'WC', _wordChar );

// Property and accessor. May not contain reserved characters. Accessor may
// contain any non-bracket characters.
const _propertyRe = /*@__PURE__*/ /\.(WC+)(?:\[(.+)\])?/.source.replace( 'WC', _wordChar );

const _trackRe = new RegExp( ''
	+ '^'
	+ _directoryRe
	+ _nodeRe
	+ _objectRe
	+ _propertyRe
	+ '$'
);

const _supportedObjectNames = [ 'material', 'materials', 'bones', 'map' ];

class Composite {

	constructor( targetGroup, path, optionalParsedPath ) {

		const parsedPath = optionalParsedPath || PropertyBinding.parseTrackName( path );

		this._targetGroup = targetGroup;
		this._bindings = targetGroup.subscribe_( path, parsedPath );

	}

	getValue( array, offset ) {

		this.bind(); // bind all binding

		const firstValidIndex = this._targetGroup.nCachedObjects_,
			binding = this._bindings[ firstValidIndex ];

		// and only call .getValue on the first
		if ( binding !== undefined ) binding.getValue( array, offset );

	}

	setValue( array, offset ) {

		const bindings = this._bindings;

		for ( let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++ i ) {

			bindings[ i ].setValue( array, offset );

		}

	}

	bind() {

		const bindings = this._bindings;

		for ( let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++ i ) {

			bindings[ i ].bind();

		}

	}

	unbind() {

		const bindings = this._bindings;

		for ( let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++ i ) {

			bindings[ i ].unbind();

		}

	}

}

// Note: This class uses a State pattern on a per-method basis:
// 'bind' sets 'this.getValue' / 'setValue' and shadows the
// prototype version of these methods with one that represents
// the bound state. When the property is not found, the methods
// become no-ops.


/**
 * This holds a reference to a real property in the scene graph; used internally.
 */
class PropertyBinding {

	/**
	 * Constructs a new property binding.
	 *
	 * @param {Object} rootNode - The root node.
	 * @param {string} path - The path.
	 * @param {?Object} [parsedPath] - The parsed path.
	 */
	constructor( rootNode, path, parsedPath ) {

		/**
		 * The object path to the animated property.
		 *
		 * @type {string}
		 */
		this.path = path;

		/**
		 * An object holding information about the path.
		 *
		 * @type {Object}
		 */
		this.parsedPath = parsedPath || PropertyBinding.parseTrackName( path );

		/**
		 * The object owns the animated property.
		 *
		 * @type {?Object}
		 */
		this.node = PropertyBinding.findNode( rootNode, this.parsedPath.nodeName );

		/**
		 * The root node.
		 *
		 * @type {Object3D|Skeleton}
		 */
		this.rootNode = rootNode;

		// initial state of these methods that calls 'bind'
		this.getValue = this._getValue_unbound;
		this.setValue = this._setValue_unbound;

	}


	/**
	 * Factory method for creating a property binding from the given parameters.
	 *
	 * @static
	 * @param {Object} root - The root node.
	 * @param {string} path - The path.
	 * @param {?Object} [parsedPath] - The parsed path.
	 * @return {PropertyBinding|Composite} The created property binding or composite.
	 */
	static create( root, path, parsedPath ) {

		if ( ! ( root && root.isAnimationObjectGroup ) ) {

			return new PropertyBinding( root, path, parsedPath );

		} else {

			return new PropertyBinding.Composite( root, path, parsedPath );

		}

	}

	/**
	 * Replaces spaces with underscores and removes unsupported characters from
	 * node names, to ensure compatibility with parseTrackName().
	 *
	 * @param {string} name - Node name to be sanitized.
	 * @return {string} The sanitized node name.
	 */
	static sanitizeNodeName( name ) {

		return name.replace( /\s/g, '_' ).replace( _reservedRe, '' );

	}

	/**
	 * Parses the given track name (an object path to an animated property) and
	 * returns an object with information about the path. Matches strings in the following forms:
	 *
	 * - nodeName.property
	 * - nodeName.property[accessor]
	 * - nodeName.material.property[accessor]
	 * - uuid.property[accessor]
	 * - uuid.objectName[objectIndex].propertyName[propertyIndex]
	 * - parentName/nodeName.property
	 * - parentName/parentName/nodeName.property[index]
	 * - .bone[Armature.DEF_cog].position
	 * - scene:helium_balloon_model:helium_balloon_model.position
	 *
	 * @static
	 * @param {string} trackName - The track name to parse.
	 * @return {Object} The parsed track name as an object.
	 */
	static parseTrackName( trackName ) {

		const matches = _trackRe.exec( trackName );

		if ( matches === null ) {

			throw new Error( 'PropertyBinding: Cannot parse trackName: ' + trackName );

		}

		const results = {
			// directoryName: matches[ 1 ], // (tschw) currently unused
			nodeName: matches[ 2 ],
			objectName: matches[ 3 ],
			objectIndex: matches[ 4 ],
			propertyName: matches[ 5 ], // required
			propertyIndex: matches[ 6 ]
		};

		const lastDot = results.nodeName && results.nodeName.lastIndexOf( '.' );

		if ( lastDot !== undefined && lastDot !== -1 ) {

			const objectName = results.nodeName.substring( lastDot + 1 );

			// Object names must be checked against an allowlist. Otherwise, there
			// is no way to parse 'foo.bar.baz': 'baz' must be a property, but
			// 'bar' could be the objectName, or part of a nodeName (which can
			// include '.' characters).
			if ( _supportedObjectNames.indexOf( objectName ) !== -1 ) {

				results.nodeName = results.nodeName.substring( 0, lastDot );
				results.objectName = objectName;

			}

		}

		if ( results.propertyName === null || results.propertyName.length === 0 ) {

			throw new Error( 'PropertyBinding: can not parse propertyName from trackName: ' + trackName );

		}

		return results;

	}

	/**
	 * Searches for a node in the hierarchy of the given root object by the given
	 * node name.
	 *
	 * @static
	 * @param {Object} root - The root object.
	 * @param {string|number} nodeName - The name of the node.
	 * @return {?Object} The found node. Returns `null` if no object was found.
	 */
	static findNode( root, nodeName ) {

		if ( nodeName === undefined || nodeName === '' || nodeName === '.' || nodeName === -1 || nodeName === root.name || nodeName === root.uuid ) {

			return root;

		}

		// search into skeleton bones.
		if ( root.skeleton ) {

			const bone = root.skeleton.getBoneByName( nodeName );

			if ( bone !== undefined ) {

				return bone;

			}

		}

		// search into node subtree.
		if ( root.children ) {

			const searchNodeSubtree = function ( children ) {

				for ( let i = 0; i < children.length; i ++ ) {

					const childNode = children[ i ];

					if ( childNode.name === nodeName || childNode.uuid === nodeName ) {

						return childNode;

					}

					const result = searchNodeSubtree( childNode.children );

					if ( result ) return result;

				}

				return null;

			};

			const subTreeNode = searchNodeSubtree( root.children );

			if ( subTreeNode ) {

				return subTreeNode;

			}

		}

		return null;

	}

	// these are used to "bind" a nonexistent property
	_getValue_unavailable() {}
	_setValue_unavailable() {}

	// Getters

	_getValue_direct( buffer, offset ) {

		buffer[ offset ] = this.targetObject[ this.propertyName ];

	}

	_getValue_array( buffer, offset ) {

		const source = this.resolvedProperty;

		for ( let i = 0, n = source.length; i !== n; ++ i ) {

			buffer[ offset ++ ] = source[ i ];

		}

	}

	_getValue_arrayElement( buffer, offset ) {

		buffer[ offset ] = this.resolvedProperty[ this.propertyIndex ];

	}

	_getValue_toArray( buffer, offset ) {

		this.resolvedProperty.toArray( buffer, offset );

	}

	// Direct

	_setValue_direct( buffer, offset ) {

		this.targetObject[ this.propertyName ] = buffer[ offset ];

	}

	_setValue_direct_setNeedsUpdate( buffer, offset ) {

		this.targetObject[ this.propertyName ] = buffer[ offset ];
		this.targetObject.needsUpdate = true;

	}

	_setValue_direct_setMatrixWorldNeedsUpdate( buffer, offset ) {

		this.targetObject[ this.propertyName ] = buffer[ offset ];
		this.targetObject.matrixWorldNeedsUpdate = true;

	}

	// EntireArray

	_setValue_array( buffer, offset ) {

		const dest = this.resolvedProperty;

		for ( let i = 0, n = dest.length; i !== n; ++ i ) {

			dest[ i ] = buffer[ offset ++ ];

		}

	}

	_setValue_array_setNeedsUpdate( buffer, offset ) {

		const dest = this.resolvedProperty;

		for ( let i = 0, n = dest.length; i !== n; ++ i ) {

			dest[ i ] = buffer[ offset ++ ];

		}

		this.targetObject.needsUpdate = true;

	}

	_setValue_array_setMatrixWorldNeedsUpdate( buffer, offset ) {

		const dest = this.resolvedProperty;

		for ( let i = 0, n = dest.length; i !== n; ++ i ) {

			dest[ i ] = buffer[ offset ++ ];

		}

		this.targetObject.matrixWorldNeedsUpdate = true;

	}

	// ArrayElement

	_setValue_arrayElement( buffer, offset ) {

		this.resolvedProperty[ this.propertyIndex ] = buffer[ offset ];

	}

	_setValue_arrayElement_setNeedsUpdate( buffer, offset ) {

		this.resolvedProperty[ this.propertyIndex ] = buffer[ offset ];
		this.targetObject.needsUpdate = true;

	}

	_setValue_arrayElement_setMatrixWorldNeedsUpdate( buffer, offset ) {

		this.resolvedProperty[ this.propertyIndex ] = buffer[ offset ];
		this.targetObject.matrixWorldNeedsUpdate = true;

	}

	// HasToFromArray

	_setValue_fromArray( buffer, offset ) {

		this.resolvedProperty.fromArray( buffer, offset );

	}

	_setValue_fromArray_setNeedsUpdate( buffer, offset ) {

		this.resolvedProperty.fromArray( buffer, offset );
		this.targetObject.needsUpdate = true;

	}

	_setValue_fromArray_setMatrixWorldNeedsUpdate( buffer, offset ) {

		this.resolvedProperty.fromArray( buffer, offset );
		this.targetObject.matrixWorldNeedsUpdate = true;

	}

	_getValue_unbound( targetArray, offset ) {

		this.bind();
		this.getValue( targetArray, offset );

	}

	_setValue_unbound( sourceArray, offset ) {

		this.bind();
		this.setValue( sourceArray, offset );

	}

	/**
	 * Creates a getter / setter pair for the property tracked by this binding.
	 */
	bind() {

		let targetObject = this.node;
		const parsedPath = this.parsedPath;

		const objectName = parsedPath.objectName;
		const propertyName = parsedPath.propertyName;
		let propertyIndex = parsedPath.propertyIndex;

		if ( ! targetObject ) {

			targetObject = PropertyBinding.findNode( this.rootNode, parsedPath.nodeName );

			this.node = targetObject;

		}

		// set fail state so we can just 'return' on error
		this.getValue = this._getValue_unavailable;
		this.setValue = this._setValue_unavailable;

		// ensure there is a value node
		if ( ! targetObject ) {

			console.warn( 'THREE.PropertyBinding: No target node found for track: ' + this.path + '.' );
			return;

		}

		if ( objectName ) {

			let objectIndex = parsedPath.objectIndex;

			// special cases were we need to reach deeper into the hierarchy to get the face materials....
			switch ( objectName ) {

				case 'materials':

					if ( ! targetObject.material ) {

						console.error( 'THREE.PropertyBinding: Can not bind to material as node does not have a material.', this );
						return;

					}

					if ( ! targetObject.material.materials ) {

						console.error( 'THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.', this );
						return;

					}

					targetObject = targetObject.material.materials;

					break;

				case 'bones':

					if ( ! targetObject.skeleton ) {

						console.error( 'THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.', this );
						return;

					}

					// potential future optimization: skip this if propertyIndex is already an integer
					// and convert the integer string to a true integer.

					targetObject = targetObject.skeleton.bones;

					// support resolving morphTarget names into indices.
					for ( let i = 0; i < targetObject.length; i ++ ) {

						if ( targetObject[ i ].name === objectIndex ) {

							objectIndex = i;
							break;

						}

					}

					break;

				case 'map':

					if ( 'map' in targetObject ) {

						targetObject = targetObject.map;
						break;

					}

					if ( ! targetObject.material ) {

						console.error( 'THREE.PropertyBinding: Can not bind to material as node does not have a material.', this );
						return;

					}

					if ( ! targetObject.material.map ) {

						console.error( 'THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.', this );
						return;

					}

					targetObject = targetObject.material.map;
					break;

				default:

					if ( targetObject[ objectName ] === undefined ) {

						console.error( 'THREE.PropertyBinding: Can not bind to objectName of node undefined.', this );
						return;

					}

					targetObject = targetObject[ objectName ];

			}


			if ( objectIndex !== undefined ) {

				if ( targetObject[ objectIndex ] === undefined ) {

					console.error( 'THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.', this, targetObject );
					return;

				}

				targetObject = targetObject[ objectIndex ];

			}

		}

		// resolve property
		const nodeProperty = targetObject[ propertyName ];

		if ( nodeProperty === undefined ) {

			const nodeName = parsedPath.nodeName;

			console.error( 'THREE.PropertyBinding: Trying to update property for track: ' + nodeName +
				'.' + propertyName + ' but it wasn\'t found.', targetObject );
			return;

		}

		// determine versioning scheme
		let versioning = this.Versioning.None;

		this.targetObject = targetObject;

		if ( targetObject.isMaterial === true ) {

			versioning = this.Versioning.NeedsUpdate;

		} else if ( targetObject.isObject3D === true ) {

			versioning = this.Versioning.MatrixWorldNeedsUpdate;

		}

		// determine how the property gets bound
		let bindingType = this.BindingType.Direct;

		if ( propertyIndex !== undefined ) {

			// access a sub element of the property array (only primitives are supported right now)

			if ( propertyName === 'morphTargetInfluences' ) {

				// potential optimization, skip this if propertyIndex is already an integer, and convert the integer string to a true integer.

				// support resolving morphTarget names into indices.
				if ( ! targetObject.geometry ) {

					console.error( 'THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.', this );
					return;

				}

				if ( ! targetObject.geometry.morphAttributes ) {

					console.error( 'THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.', this );
					return;

				}

				if ( targetObject.morphTargetDictionary[ propertyIndex ] !== undefined ) {

					propertyIndex = targetObject.morphTargetDictionary[ propertyIndex ];

				}

			}

			bindingType = this.BindingType.ArrayElement;

			this.resolvedProperty = nodeProperty;
			this.propertyIndex = propertyIndex;

		} else if ( nodeProperty.fromArray !== undefined && nodeProperty.toArray !== undefined ) {

			// must use copy for Object3D.Euler/Quaternion

			bindingType = this.BindingType.HasFromToArray;

			this.resolvedProperty = nodeProperty;

		} else if ( Array.isArray( nodeProperty ) ) {

			bindingType = this.BindingType.EntireArray;

			this.resolvedProperty = nodeProperty;

		} else {

			this.propertyName = propertyName;

		}

		// select getter / setter
		this.getValue = this.GetterByBindingType[ bindingType ];
		this.setValue = this.SetterByBindingTypeAndVersioning[ bindingType ][ versioning ];

	}

	/**
	 * Unbinds the property.
	 */
	unbind() {

		this.node = null;

		// back to the prototype version of getValue / setValue
		// note: avoiding to mutate the shape of 'this' via 'delete'
		this.getValue = this._getValue_unbound;
		this.setValue = this._setValue_unbound;

	}

}

PropertyBinding.Composite = Composite;

PropertyBinding.prototype.BindingType = {
	Direct: 0,
	EntireArray: 1,
	ArrayElement: 2,
	HasFromToArray: 3
};

PropertyBinding.prototype.Versioning = {
	None: 0,
	NeedsUpdate: 1,
	MatrixWorldNeedsUpdate: 2
};

PropertyBinding.prototype.GetterByBindingType = [

	PropertyBinding.prototype._getValue_direct,
	PropertyBinding.prototype._getValue_array,
	PropertyBinding.prototype._getValue_arrayElement,
	PropertyBinding.prototype._getValue_toArray,

];

PropertyBinding.prototype.SetterByBindingTypeAndVersioning = [

	[
		// Direct
		PropertyBinding.prototype._setValue_direct,
		PropertyBinding.prototype._setValue_direct_setNeedsUpdate,
		PropertyBinding.prototype._setValue_direct_setMatrixWorldNeedsUpdate,

	], [

		// EntireArray

		PropertyBinding.prototype._setValue_array,
		PropertyBinding.prototype._setValue_array_setNeedsUpdate,
		PropertyBinding.prototype._setValue_array_setMatrixWorldNeedsUpdate,

	], [

		// ArrayElement
		PropertyBinding.prototype._setValue_arrayElement,
		PropertyBinding.prototype._setValue_arrayElement_setNeedsUpdate,
		PropertyBinding.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate,

	], [

		// HasToFromArray
		PropertyBinding.prototype._setValue_fromArray,
		PropertyBinding.prototype._setValue_fromArray_setNeedsUpdate,
		PropertyBinding.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate,

	]

];

/**
 * A group of objects that receives a shared animation state.
 *
 * Usage:
 *
 * - Add objects you would otherwise pass as 'root' to the
 * constructor or the .clipAction method of AnimationMixer.
 * - Instead pass this object as 'root'.
 * - You can also add and remove objects later when the mixer is running.
 *
 * Note:
 *
 * - Objects of this class appear as one object to the mixer,
 * so cache control of the individual objects must be done on the group.
 *
 * Limitation:
 *
 * - The animated properties must be compatible among the all objects in the group.
 * - A single property can either be controlled through a target group or directly, but not both.
 */
class AnimationObjectGroup {

	/**
	 * Constructs a new animation group.
	 *
	 * @param {...Object3D} arguments - An arbitrary number of 3D objects that share the same animation state.
	 */
	constructor() {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isAnimationObjectGroup = true;

		/**
		 * The UUID of the 3D object.
		 *
		 * @type {string}
		 * @readonly
		 */
		this.uuid = generateUUID();

		// cached objects followed by the active ones
		this._objects = Array.prototype.slice.call( arguments );

		this.nCachedObjects_ = 0; // threshold
		// note: read by PropertyBinding.Composite

		const indices = {};
		this._indicesByUUID = indices; // for bookkeeping

		for ( let i = 0, n = arguments.length; i !== n; ++ i ) {

			indices[ arguments[ i ].uuid ] = i;

		}

		this._paths = []; // inside: string
		this._parsedPaths = []; // inside: { we don't care, here }
		this._bindings = []; // inside: Array< PropertyBinding >
		this._bindingsIndicesByPath = {}; // inside: indices in these arrays

		const scope = this;

		this.stats = {

			objects: {
				get total() {

					return scope._objects.length;

				},
				get inUse() {

					return this.total - scope.nCachedObjects_;

				}
			},
			get bindingsPerObject() {

				return scope._bindings.length;

			}

		};

	}

	/**
	 * Adds an arbitrary number of objects to this animation group.
	 *
	 * @param {...Object3D} arguments - The 3D objects to add.
	 */
	add() {

		const objects = this._objects,
			indicesByUUID = this._indicesByUUID,
			paths = this._paths,
			parsedPaths = this._parsedPaths,
			bindings = this._bindings,
			nBindings = bindings.length;

		let knownObject = undefined,
			nObjects = objects.length,
			nCachedObjects = this.nCachedObjects_;

		for ( let i = 0, n = arguments.length; i !== n; ++ i ) {

			const object = arguments[ i ],
				uuid = object.uuid;
			let index = indicesByUUID[ uuid ];

			if ( index === undefined ) {

				// unknown object -> add it to the ACTIVE region

				index = nObjects ++;
				indicesByUUID[ uuid ] = index;
				objects.push( object );

				// accounting is done, now do the same for all bindings

				for ( let j = 0, m = nBindings; j !== m; ++ j ) {

					bindings[ j ].push( new PropertyBinding( object, paths[ j ], parsedPaths[ j ] ) );

				}

			} else if ( index < nCachedObjects ) {

				knownObject = objects[ index ];

				// move existing object to the ACTIVE region

				const firstActiveIndex = -- nCachedObjects,
					lastCachedObject = objects[ firstActiveIndex ];

				indicesByUUID[ lastCachedObject.uuid ] = index;
				objects[ index ] = lastCachedObject;

				indicesByUUID[ uuid ] = firstActiveIndex;
				objects[ firstActiveIndex ] = object;

				// accounting is done, now do the same for all bindings

				for ( let j = 0, m = nBindings; j !== m; ++ j ) {

					const bindingsForPath = bindings[ j ],
						lastCached = bindingsForPath[ firstActiveIndex ];

					let binding = bindingsForPath[ index ];

					bindingsForPath[ index ] = lastCached;

					if ( binding === undefined ) {

						// since we do not bother to create new bindings
						// for objects that are cached, the binding may
						// or may not exist

						binding = new PropertyBinding( object, paths[ j ], parsedPaths[ j ] );

					}

					bindingsForPath[ firstActiveIndex ] = binding;

				}

			} else if ( objects[ index ] !== knownObject ) {

				console.error( 'THREE.AnimationObjectGroup: Different objects with the same UUID ' +
					'detected. Clean the caches or recreate your infrastructure when reloading scenes.' );

			} // else the object is already where we want it to be

		} // for arguments

		this.nCachedObjects_ = nCachedObjects;

	}

	/**
	 * Removes an arbitrary number of objects to this animation group
	 *
	 * @param {...Object3D} arguments - The 3D objects to remove.
	 */
	remove() {

		const objects = this._objects,
			indicesByUUID = this._indicesByUUID,
			bindings = this._bindings,
			nBindings = bindings.length;

		let nCachedObjects = this.nCachedObjects_;

		for ( let i = 0, n = arguments.length; i !== n; ++ i ) {

			const object = arguments[ i ],
				uuid = object.uuid,
				index = indicesByUUID[ uuid ];

			if ( index !== undefined && index >= nCachedObjects ) {

				// move existing object into the CACHED region

				const lastCachedIndex = nCachedObjects ++,
					firstActiveObject = objects[ lastCachedIndex ];

				indicesByUUID[ firstActiveObject.uuid ] = index;
				objects[ index ] = firstActiveObject;

				indicesByUUID[ uuid ] = lastCachedIndex;
				objects[ lastCachedIndex ] = object;

				// accounting is done, now do the same for all bindings

				for ( let j = 0, m = nBindings; j !== m; ++ j ) {

					const bindingsForPath = bindings[ j ],
						firstActive = bindingsForPath[ lastCachedIndex ],
						binding = bindingsForPath[ index ];

					bindingsForPath[ index ] = firstActive;
					bindingsForPath[ lastCachedIndex ] = binding;

				}

			}

		} // for arguments

		this.nCachedObjects_ = nCachedObjects;

	}

	/**
	 * Deallocates all memory resources for the passed 3D objects of this animation group.
	 *
	 * @param {...Object3D} arguments - The 3D objects to uncache.
	 */
	uncache() {

		const objects = this._objects,
			indicesByUUID = this._indicesByUUID,
			bindings = this._bindings,
			nBindings = bindings.length;

		let nCachedObjects = this.nCachedObjects_,
			nObjects = objects.length;

		for ( let i = 0, n = arguments.length; i !== n; ++ i ) {

			const object = arguments[ i ],
				uuid = object.uuid,
				index = indicesByUUID[ uuid ];

			if ( index !== undefined ) {

				delete indicesByUUID[ uuid ];

				if ( index < nCachedObjects ) {

					// object is cached, shrink the CACHED region

					const firstActiveIndex = -- nCachedObjects,
						lastCachedObject = objects[ firstActiveIndex ],
						lastIndex = -- nObjects,
						lastObject = objects[ lastIndex ];

					// last cached object takes this object's place
					indicesByUUID[ lastCachedObject.uuid ] = index;
					objects[ index ] = lastCachedObject;

					// last object goes to the activated slot and pop
					indicesByUUID[ lastObject.uuid ] = firstActiveIndex;
					objects[ firstActiveIndex ] = lastObject;
					objects.pop();

					// accounting is done, now do the same for all bindings

					for ( let j = 0, m = nBindings; j !== m; ++ j ) {

						const bindingsForPath = bindings[ j ],
							lastCached = bindingsForPath[ firstActiveIndex ],
							last = bindingsForPath[ lastIndex ];

						bindingsForPath[ index ] = lastCached;
						bindingsForPath[ firstActiveIndex ] = last;
						bindingsForPath.pop();

					}

				} else {

					// object is active, just swap with the last and pop

					const lastIndex = -- nObjects,
						lastObject = objects[ lastIndex ];

					if ( lastIndex > 0 ) {

						indicesByUUID[ lastObject.uuid ] = index;

					}

					objects[ index ] = lastObject;
					objects.pop();

					// accounting is done, now do the same for all bindings

					for ( let j = 0, m = nBindings; j !== m; ++ j ) {

						const bindingsForPath = bindings[ j ];

						bindingsForPath[ index ] = bindingsForPath[ lastIndex ];
						bindingsForPath.pop();

					}

				} // cached or active

			} // if object is known

		} // for arguments

		this.nCachedObjects_ = nCachedObjects;

	}

	// Internal interface used by befriended PropertyBinding.Composite:

	subscribe_( path, parsedPath ) {

		// returns an array of bindings for the given path that is changed
		// according to the contained objects in the group

		const indicesByPath = this._bindingsIndicesByPath;
		let index = indicesByPath[ path ];
		const bindings = this._bindings;

		if ( index !== undefined ) return bindings[ index ];

		const paths = this._paths,
			parsedPaths = this._parsedPaths,
			objects = this._objects,
			nObjects = objects.length,
			nCachedObjects = this.nCachedObjects_,
			bindingsForPath = new Array( nObjects );

		index = bindings.length;

		indicesByPath[ path ] = index;

		paths.push( path );
		parsedPaths.push( parsedPath );
		bindings.push( bindingsForPath );

		for ( let i = nCachedObjects, n = objects.length; i !== n; ++ i ) {

			const object = objects[ i ];
			bindingsForPath[ i ] = new PropertyBinding( object, path, parsedPath );

		}

		return bindingsForPath;

	}

	unsubscribe_( path ) {

		// tells the group to forget about a property path and no longer
		// update the array previously obtained with 'subscribe_'

		const indicesByPath = this._bindingsIndicesByPath,
			index = indicesByPath[ path ];

		if ( index !== undefined ) {

			const paths = this._paths,
				parsedPaths = this._parsedPaths,
				bindings = this._bindings,
				lastBindingsIndex = bindings.length - 1,
				lastBindings = bindings[ lastBindingsIndex ],
				lastBindingsPath = path[ lastBindingsIndex ];

			indicesByPath[ lastBindingsPath ] = index;

			bindings[ index ] = lastBindings;
			bindings.pop();

			parsedPaths[ index ] = parsedPaths[ lastBindingsIndex ];
			parsedPaths.pop();

			paths[ index ] = paths[ lastBindingsIndex ];
			paths.pop();

		}

	}

}

/**
 * An instance of `AnimationAction` schedules the playback of an animation which is
 * stored in {@link AnimationClip}.
 */
class AnimationAction {

	/**
	 * Constructs a new animation action.
	 *
	 * @param {AnimationMixer} mixer - The mixer that is controlled by this action.
	 * @param {AnimationClip} clip - The animation clip that holds the actual keyframes.
	 * @param {?Object3D} [localRoot=null] - The root object on which this action is performed.
	 * @param {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)} [blendMode] - The blend mode.
	 */
	constructor( mixer, clip, localRoot = null, blendMode = clip.blendMode ) {

		this._mixer = mixer;
		this._clip = clip;
		this._localRoot = localRoot;

		/**
		 * Defines how the animation is blended/combined when two or more animations
		 * are simultaneously played.
		 *
		 * @type {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)}
		 */
		this.blendMode = blendMode;

		const tracks = clip.tracks,
			nTracks = tracks.length,
			interpolants = new Array( nTracks );

		const interpolantSettings = {
			endingStart: ZeroCurvatureEnding,
			endingEnd: ZeroCurvatureEnding
		};

		for ( let i = 0; i !== nTracks; ++ i ) {

			const interpolant = tracks[ i ].createInterpolant( null );
			interpolants[ i ] = interpolant;
			interpolant.settings = interpolantSettings;

		}

		this._interpolantSettings = interpolantSettings;

		this._interpolants = interpolants; // bound by the mixer

		// inside: PropertyMixer (managed by the mixer)
		this._propertyBindings = new Array( nTracks );

		this._cacheIndex = null; // for the memory manager
		this._byClipCacheIndex = null; // for the memory manager

		this._timeScaleInterpolant = null;
		this._weightInterpolant = null;

		/**
		 * The loop mode, set via {@link AnimationAction#setLoop}.
		 *
		 * @type {(LoopRepeat|LoopOnce|LoopPingPong)}
		 * @default LoopRepeat
		 */
		this.loop = LoopRepeat;
		this._loopCount = -1;

		// global mixer time when the action is to be started
		// it's set back to 'null' upon start of the action
		this._startTime = null;

		/**
		 * The local time of this action (in seconds, starting with `0`).
		 *
		 * The value gets clamped or wrapped to `[0,clip.duration]` (according to the
		 * loop state).
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.time = 0;

		/**
		 * Scaling factor for the {@link AnimationAction#time}. A value of `0` causes the
		 * animation to pause. Negative values cause the animation to play backwards.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.timeScale = 1;
		this._effectiveTimeScale = 1;

		/**
		 * The degree of influence of this action (in the interval `[0, 1]`). Values
		 * between `0` (no impact) and `1` (full impact) can be used to blend between
		 * several actions.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.weight = 1;
		this._effectiveWeight = 1;

		/**
		 * The number of repetitions of the performed clip over the course of this action.
		 * Can be set via {@link AnimationAction#setLoop}.
		 *
		 * Setting this number has no effect if {@link AnimationAction#loop} is set to
		 * `THREE:LoopOnce`.
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.repetitions = Infinity;

		/**
		 * If set to `true`, the playback of the action is paused.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.paused = false;

		/**
		 * If set to `false`, the action is disabled so it has no impact.
		 *
		 * When the action is re-enabled, the animation continues from its current
		 * time (setting `enabled` to `false` doesn't reset the action).
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.enabled = true;

		/**
		 * If set to true the animation will automatically be paused on its last frame.
		 *
		 * If set to false, {@link AnimationAction#enabled} will automatically be switched
		 * to `false` when the last loop of the action has finished, so that this action has
		 * no further impact.
		 *
		 * Note: This member has no impact if the action is interrupted (it
		 * has only an effect if its last loop has really finished).
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.clampWhenFinished = false;

		/**
		 * Enables smooth interpolation without separate clips for start, loop and end.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.zeroSlopeAtStart = true;

		/**
		 * Enables smooth interpolation without separate clips for start, loop and end.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.zeroSlopeAtEnd = true;

	}

	/**
	 * Starts the playback of the animation.
	 *
	 * @return {AnimationAction} A reference to this animation action.
	 */
	play() {

		this._mixer._activateAction( this );

		return this;

	}

	/**
	 * Stops the playback of the animation.
	 *
	 * @return {AnimationAction} A reference to this animation action.
	 */
	stop() {

		this._mixer._deactivateAction( this );

		return this.reset();

	}

	/**
	 * Resets the playback of the animation.
	 *
	 * @return {AnimationAction} A reference to this animation action.
	 */
	reset() {

		this.paused = false;
		this.enabled = true;

		this.time = 0; // restart clip
		this._loopCount = -1;// forget previous loops
		this._startTime = null;// forget scheduling

		return this.stopFading().stopWarping();

	}

	/**
	 * Returns `true` if the animation is running.
	 *
	 * @return {boolean} Whether the animation is running or not.
	 */
	isRunning() {

		return this.enabled && ! this.paused && this.timeScale !== 0 &&
			this._startTime === null && this._mixer._isActiveAction( this );

	}

	/**
	 * Returns `true` when {@link AnimationAction#play} has been called.
	 *
	 * @return {boolean} Whether the animation is scheduled or not.
	 */
	isScheduled() {

		return this._mixer._isActiveAction( this );

	}

	/**
	 * Defines the time when the animation should start.
	 *
	 * @param {number} time - The start time in seconds.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	startAt( time ) {

		this._startTime = time;

		return this;

	}

	/**
	 * Configures the loop settings for this action.
	 *
	 * @param {(LoopRepeat|LoopOnce|LoopPingPong)} mode - The loop mode.
	 * @param {number} repetitions - The number of repetitions.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	setLoop( mode, repetitions ) {

		this.loop = mode;
		this.repetitions = repetitions;

		return this;

	}

	/**
	 * Sets the effective weight of this action.
	 *
	 * An action has no effect and thus an effective weight of zero when the
	 * action is disabled.
	 *
	 * @param {number} weight - The weight to set.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	setEffectiveWeight( weight ) {

		this.weight = weight;

		// note: same logic as when updated at runtime
		this._effectiveWeight = this.enabled ? weight : 0;

		return this.stopFading();

	}

	/**
	 * Returns the effective weight of this action.
	 *
	 * @return {number} The effective weight.
	 */
	getEffectiveWeight() {

		return this._effectiveWeight;

	}

	/**
	 * Fades the animation in by increasing its weight gradually from `0` to `1`,
	 * within the passed time interval.
	 *
	 * @param {number} duration - The duration of the fade.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	fadeIn( duration ) {

		return this._scheduleFading( duration, 0, 1 );

	}

	/**
	 * Fades the animation out by decreasing its weight gradually from `1` to `0`,
	 * within the passed time interval.
	 *
	 * @param {number} duration - The duration of the fade.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	fadeOut( duration ) {

		return this._scheduleFading( duration, 1, 0 );

	}

	/**
	 * Causes this action to fade in and the given action to fade out,
	 * within the passed time interval.
	 *
	 * @param {AnimationAction} fadeOutAction - The animation action to fade out.
	 * @param {number} duration - The duration of the fade.
	 * @param {boolean} [warp=false] - Whether warping should be used or not.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	crossFadeFrom( fadeOutAction, duration, warp = false ) {

		fadeOutAction.fadeOut( duration );
		this.fadeIn( duration );

		if ( warp === true ) {

			const fadeInDuration = this._clip.duration,
				fadeOutDuration = fadeOutAction._clip.duration,

				startEndRatio = fadeOutDuration / fadeInDuration,
				endStartRatio = fadeInDuration / fadeOutDuration;

			fadeOutAction.warp( 1.0, startEndRatio, duration );
			this.warp( endStartRatio, 1.0, duration );

		}

		return this;

	}

	/**
	 * Causes this action to fade out and the given action to fade in,
	 * within the passed time interval.
	 *
	 * @param {AnimationAction} fadeInAction - The animation action to fade in.
	 * @param {number} duration - The duration of the fade.
	 * @param {boolean} [warp=false] - Whether warping should be used or not.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	crossFadeTo( fadeInAction, duration, warp = false ) {

		return fadeInAction.crossFadeFrom( this, duration, warp );

	}

	/**
	 * Stops any fading which is applied to this action.
	 *
	 * @return {AnimationAction} A reference to this animation action.
	 */
	stopFading() {

		const weightInterpolant = this._weightInterpolant;

		if ( weightInterpolant !== null ) {

			this._weightInterpolant = null;
			this._mixer._takeBackControlInterpolant( weightInterpolant );

		}

		return this;

	}

	/**
	 * Sets the effective time scale of this action.
	 *
	 * An action has no effect and thus an effective time scale of zero when the
	 * action is paused.
	 *
	 * @param {number} timeScale - The time scale to set.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	setEffectiveTimeScale( timeScale ) {

		this.timeScale = timeScale;
		this._effectiveTimeScale = this.paused ? 0 : timeScale;

		return this.stopWarping();

	}

	/**
	 * Returns the effective time scale of this action.
	 *
	 * @return {number} The effective time scale.
	 */
	getEffectiveTimeScale() {

		return this._effectiveTimeScale;

	}

	/**
	 * Sets the duration for a single loop of this action.
	 *
	 * @param {number} duration - The duration to set.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	setDuration( duration ) {

		this.timeScale = this._clip.duration / duration;

		return this.stopWarping();

	}

	/**
	 * Synchronizes this action with the passed other action.
	 *
	 * @param {AnimationAction} action - The action to sync with.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	syncWith( action ) {

		this.time = action.time;
		this.timeScale = action.timeScale;

		return this.stopWarping();

	}

	/**
	 * Decelerates this animation's speed to `0` within the passed time interval.
	 *
	 * @param {number} duration - The duration.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	halt( duration ) {

		return this.warp( this._effectiveTimeScale, 0, duration );

	}

	/**
	 * Changes the playback speed, within the passed time interval, by modifying
	 * {@link AnimationAction#timeScale} gradually from `startTimeScale` to
	 * `endTimeScale`.
	 *
	 * @param {number} startTimeScale - The start time scale.
	 * @param {number} endTimeScale - The end time scale.
	 * @param {number} duration - The duration.
	 * @return {AnimationAction} A reference to this animation action.
	 */
	warp( startTimeScale, endTimeScale, duration ) {

		const mixer = this._mixer,
			now = mixer.time,
			timeScale = this.timeScale;

		let interpolant = this._timeScaleInterpolant;

		if ( interpolant === null ) {

			interpolant = mixer._lendControlInterpolant();
			this._timeScaleInterpolant = interpolant;

		}

		const times = interpolant.parameterPositions,
			values = interpolant.sampleValues;

		times[ 0 ] = now;
		times[ 1 ] = now + duration;

		values[ 0 ] = startTimeScale / timeScale;
		values[ 1 ] = endTimeScale / timeScale;

		return this;

	}

	/**
	 * Stops any scheduled warping which is applied to this action.
	 *
	 * @return {AnimationAction} A reference to this animation action.
	 */
	stopWarping() {

		const timeScaleInterpolant = this._timeScaleInterpolant;

		if ( timeScaleInterpolant !== null ) {

			this._timeScaleInterpolant = null;
			this._mixer._takeBackControlInterpolant( timeScaleInterpolant );

		}

		return this;

	}

	/**
	 * Returns the animation mixer of this animation action.
	 *
	 * @return {AnimationMixer} The animation mixer.
	 */
	getMixer() {

		return this._mixer;

	}

	/**
	 * Returns the animation clip of this animation action.
	 *
	 * @return {AnimationClip} The animation clip.
	 */
	getClip() {

		return this._clip;

	}

	/**
	 * Returns the root object of this animation action.
	 *
	 * @return {Object3D} The root object.
	 */
	getRoot() {

		return this._localRoot || this._mixer._root;

	}

	// Interna

	_update( time, deltaTime, timeDirection, accuIndex ) {

		// called by the mixer

		if ( ! this.enabled ) {

			// call ._updateWeight() to update ._effectiveWeight

			this._updateWeight( time );
			return;

		}

		const startTime = this._startTime;

		if ( startTime !== null ) {

			// check for scheduled start of action

			const timeRunning = ( time - startTime ) * timeDirection;
			if ( timeRunning < 0 || timeDirection === 0 ) {

				deltaTime = 0;

			} else {


				this._startTime = null; // unschedule
				deltaTime = timeDirection * timeRunning;

			}

		}

		// apply time scale and advance time

		deltaTime *= this._updateTimeScale( time );
		const clipTime = this._updateTime( deltaTime );

		// note: _updateTime may disable the action resulting in
		// an effective weight of 0

		const weight = this._updateWeight( time );

		if ( weight > 0 ) {

			const interpolants = this._interpolants;
			const propertyMixers = this._propertyBindings;

			switch ( this.blendMode ) {

				case AdditiveAnimationBlendMode:

					for ( let j = 0, m = interpolants.length; j !== m; ++ j ) {

						interpolants[ j ].evaluate( clipTime );
						propertyMixers[ j ].accumulateAdditive( weight );

					}

					break;

				case NormalAnimationBlendMode:
				default:

					for ( let j = 0, m = interpolants.length; j !== m; ++ j ) {

						interpolants[ j ].evaluate( clipTime );
						propertyMixers[ j ].accumulate( accuIndex, weight );

					}

			}

		}

	}

	_updateWeight( time ) {

		let weight = 0;

		if ( this.enabled ) {

			weight = this.weight;
			const interpolant = this._weightInterpolant;

			if ( interpolant !== null ) {

				const interpolantValue = interpolant.evaluate( time )[ 0 ];

				weight *= interpolantValue;

				if ( time > interpolant.parameterPositions[ 1 ] ) {

					this.stopFading();

					if ( interpolantValue === 0 ) {

						// faded out, disable
						this.enabled = false;

					}

				}

			}

		}

		this._effectiveWeight = weight;
		return weight;

	}

	_updateTimeScale( time ) {

		let timeScale = 0;

		if ( ! this.paused ) {

			timeScale = this.timeScale;

			const interpolant = this._timeScaleInterpolant;

			if ( interpolant !== null ) {

				const interpolantValue = interpolant.evaluate( time )[ 0 ];

				timeScale *= interpolantValue;

				if ( time > interpolant.parameterPositions[ 1 ] ) {

					this.stopWarping();

					if ( timeScale === 0 ) {

						// motion has halted, pause
						this.paused = true;

					} else {

						// warp done - apply final time scale
						this.timeScale = timeScale;

					}

				}

			}

		}

		this._effectiveTimeScale = timeScale;
		return timeScale;

	}

	_updateTime( deltaTime ) {

		const duration = this._clip.duration;
		const loop = this.loop;

		let time = this.time + deltaTime;
		let loopCount = this._loopCount;

		const pingPong = ( loop === LoopPingPong );

		if ( deltaTime === 0 ) {

			if ( loopCount === -1 ) return time;

			return ( pingPong && ( loopCount & 1 ) === 1 ) ? duration - time : time;

		}

		if ( loop === LoopOnce ) {

			if ( loopCount === -1 ) {

				// just started

				this._loopCount = 0;
				this._setEndings( true, true, false );

			}

			handle_stop: {

				if ( time >= duration ) {

					time = duration;

				} else if ( time < 0 ) {

					time = 0;

				} else {

					this.time = time;

					break handle_stop;

				}

				if ( this.clampWhenFinished ) this.paused = true;
				else this.enabled = false;

				this.time = time;

				this._mixer.dispatchEvent( {
					type: 'finished', action: this,
					direction: deltaTime < 0 ? -1 : 1
				} );

			}

		} else { // repetitive Repeat or PingPong

			if ( loopCount === -1 ) {

				// just started

				if ( deltaTime >= 0 ) {

					loopCount = 0;

					this._setEndings( true, this.repetitions === 0, pingPong );

				} else {

					// when looping in reverse direction, the initial
					// transition through zero counts as a repetition,
					// so leave loopCount at -1

					this._setEndings( this.repetitions === 0, true, pingPong );

				}

			}

			if ( time >= duration || time < 0 ) {

				// wrap around

				const loopDelta = Math.floor( time / duration ); // signed
				time -= duration * loopDelta;

				loopCount += Math.abs( loopDelta );

				const pending = this.repetitions - loopCount;

				if ( pending <= 0 ) {

					// have to stop (switch state, clamp time, fire event)

					if ( this.clampWhenFinished ) this.paused = true;
					else this.enabled = false;

					time = deltaTime > 0 ? duration : 0;

					this.time = time;

					this._mixer.dispatchEvent( {
						type: 'finished', action: this,
						direction: deltaTime > 0 ? 1 : -1
					} );

				} else {

					// keep running

					if ( pending === 1 ) {

						// entering the last round

						const atStart = deltaTime < 0;
						this._setEndings( atStart, ! atStart, pingPong );

					} else {

						this._setEndings( false, false, pingPong );

					}

					this._loopCount = loopCount;

					this.time = time;

					this._mixer.dispatchEvent( {
						type: 'loop', action: this, loopDelta: loopDelta
					} );

				}

			} else {

				this.time = time;

			}

			if ( pingPong && ( loopCount & 1 ) === 1 ) {

				// invert time for the "pong round"

				return duration - time;

			}

		}

		return time;

	}

	_setEndings( atStart, atEnd, pingPong ) {

		const settings = this._interpolantSettings;

		if ( pingPong ) {

			settings.endingStart = ZeroSlopeEnding;
			settings.endingEnd = ZeroSlopeEnding;

		} else {

			// assuming for LoopOnce atStart == atEnd == true

			if ( atStart ) {

				settings.endingStart = this.zeroSlopeAtStart ? ZeroSlopeEnding : ZeroCurvatureEnding;

			} else {

				settings.endingStart = WrapAroundEnding;

			}

			if ( atEnd ) {

				settings.endingEnd = this.zeroSlopeAtEnd ? ZeroSlopeEnding : ZeroCurvatureEnding;

			} else {

				settings.endingEnd 	 = WrapAroundEnding;

			}

		}

	}

	_scheduleFading( duration, weightNow, weightThen ) {

		const mixer = this._mixer, now = mixer.time;
		let interpolant = this._weightInterpolant;

		if ( interpolant === null ) {

			interpolant = mixer._lendControlInterpolant();
			this._weightInterpolant = interpolant;

		}

		const times = interpolant.parameterPositions,
			values = interpolant.sampleValues;

		times[ 0 ] = now;
		values[ 0 ] = weightNow;
		times[ 1 ] = now + duration;
		values[ 1 ] = weightThen;

		return this;

	}

}

const _controlInterpolantsResultBuffer = new Float32Array( 1 );

/**
 * `AnimationMixer` is a player for animations on a particular object in
 * the scene. When multiple objects in the scene are animated independently,
 * one `AnimationMixer` may be used for each object.
 */
class AnimationMixer extends EventDispatcher {

	/**
	 * Constructs a new animation mixer.
	 *
	 * @param {Object3D} root - The object whose animations shall be played by this mixer.
	 */
	constructor( root ) {

		super();

		this._root = root;
		this._initMemoryManager();
		this._accuIndex = 0;

		/**
		 * The global mixer time (in seconds; starting with `0` on the mixer's creation).
		 *
		 * @type {number}
		 * @default 0
		 */
		this.time = 0;

		/**
		 * A scaling factor for the global time.
		 *
		 * Note: Setting this member to `0` and later back to `1` is a
		 * possibility to pause/unpause all actions that are controlled by this
		 * mixer.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.timeScale = 1.0;

	}

	_bindAction( action, prototypeAction ) {

		const root = action._localRoot || this._root,
			tracks = action._clip.tracks,
			nTracks = tracks.length,
			bindings = action._propertyBindings,
			interpolants = action._interpolants,
			rootUuid = root.uuid,
			bindingsByRoot = this._bindingsByRootAndName;

		let bindingsByName = bindingsByRoot[ rootUuid ];

		if ( bindingsByName === undefined ) {

			bindingsByName = {};
			bindingsByRoot[ rootUuid ] = bindingsByName;

		}

		for ( let i = 0; i !== nTracks; ++ i ) {

			const track = tracks[ i ],
				trackName = track.name;

			let binding = bindingsByName[ trackName ];

			if ( binding !== undefined ) {

				++ binding.referenceCount;
				bindings[ i ] = binding;

			} else {

				binding = bindings[ i ];

				if ( binding !== undefined ) {

					// existing binding, make sure the cache knows

					if ( binding._cacheIndex === null ) {

						++ binding.referenceCount;
						this._addInactiveBinding( binding, rootUuid, trackName );

					}

					continue;

				}

				const path = prototypeAction && prototypeAction.
					_propertyBindings[ i ].binding.parsedPath;

				binding = new PropertyMixer(
					PropertyBinding.create( root, trackName, path ),
					track.ValueTypeName, track.getValueSize() );

				++ binding.referenceCount;
				this._addInactiveBinding( binding, rootUuid, trackName );

				bindings[ i ] = binding;

			}

			interpolants[ i ].resultBuffer = binding.buffer;

		}

	}

	_activateAction( action ) {

		if ( ! this._isActiveAction( action ) ) {

			if ( action._cacheIndex === null ) {

				// this action has been forgotten by the cache, but the user
				// appears to be still using it -> rebind

				const rootUuid = ( action._localRoot || this._root ).uuid,
					clipUuid = action._clip.uuid,
					actionsForClip = this._actionsByClip[ clipUuid ];

				this._bindAction( action,
					actionsForClip && actionsForClip.knownActions[ 0 ] );

				this._addInactiveAction( action, clipUuid, rootUuid );

			}

			const bindings = action._propertyBindings;

			// increment reference counts / sort out state
			for ( let i = 0, n = bindings.length; i !== n; ++ i ) {

				const binding = bindings[ i ];

				if ( binding.useCount ++ === 0 ) {

					this._lendBinding( binding );
					binding.saveOriginalState();

				}

			}

			this._lendAction( action );

		}

	}

	_deactivateAction( action ) {

		if ( this._isActiveAction( action ) ) {

			const bindings = action._propertyBindings;

			// decrement reference counts / sort out state
			for ( let i = 0, n = bindings.length; i !== n; ++ i ) {

				const binding = bindings[ i ];

				if ( -- binding.useCount === 0 ) {

					binding.restoreOriginalState();
					this._takeBackBinding( binding );

				}

			}

			this._takeBackAction( action );

		}

	}

	// Memory manager

	_initMemoryManager() {

		this._actions = []; // 'nActiveActions' followed by inactive ones
		this._nActiveActions = 0;

		this._actionsByClip = {};
		// inside:
		// {
		// 	knownActions: Array< AnimationAction > - used as prototypes
		// 	actionByRoot: AnimationAction - lookup
		// }


		this._bindings = []; // 'nActiveBindings' followed by inactive ones
		this._nActiveBindings = 0;

		this._bindingsByRootAndName = {}; // inside: Map< name, PropertyMixer >


		this._controlInterpolants = []; // same game as above
		this._nActiveControlInterpolants = 0;

		const scope = this;

		this.stats = {

			actions: {
				get total() {

					return scope._actions.length;

				},
				get inUse() {

					return scope._nActiveActions;

				}
			},
			bindings: {
				get total() {

					return scope._bindings.length;

				},
				get inUse() {

					return scope._nActiveBindings;

				}
			},
			controlInterpolants: {
				get total() {

					return scope._controlInterpolants.length;

				},
				get inUse() {

					return scope._nActiveControlInterpolants;

				}
			}

		};

	}

	// Memory management for AnimationAction objects

	_isActiveAction( action ) {

		const index = action._cacheIndex;
		return index !== null && index < this._nActiveActions;

	}

	_addInactiveAction( action, clipUuid, rootUuid ) {

		const actions = this._actions,
			actionsByClip = this._actionsByClip;

		let actionsForClip = actionsByClip[ clipUuid ];

		if ( actionsForClip === undefined ) {

			actionsForClip = {

				knownActions: [ action ],
				actionByRoot: {}

			};

			action._byClipCacheIndex = 0;

			actionsByClip[ clipUuid ] = actionsForClip;

		} else {

			const knownActions = actionsForClip.knownActions;

			action._byClipCacheIndex = knownActions.length;
			knownActions.push( action );

		}

		action._cacheIndex = actions.length;
		actions.push( action );

		actionsForClip.actionByRoot[ rootUuid ] = action;

	}

	_removeInactiveAction( action ) {

		const actions = this._actions,
			lastInactiveAction = actions[ actions.length - 1 ],
			cacheIndex = action._cacheIndex;

		lastInactiveAction._cacheIndex = cacheIndex;
		actions[ cacheIndex ] = lastInactiveAction;
		actions.pop();

		action._cacheIndex = null;


		const clipUuid = action._clip.uuid,
			actionsByClip = this._actionsByClip,
			actionsForClip = actionsByClip[ clipUuid ],
			knownActionsForClip = actionsForClip.knownActions,

			lastKnownAction =
				knownActionsForClip[ knownActionsForClip.length - 1 ],

			byClipCacheIndex = action._byClipCacheIndex;

		lastKnownAction._byClipCacheIndex = byClipCacheIndex;
		knownActionsForClip[ byClipCacheIndex ] = lastKnownAction;
		knownActionsForClip.pop();

		action._byClipCacheIndex = null;


		const actionByRoot = actionsForClip.actionByRoot,
			rootUuid = ( action._localRoot || this._root ).uuid;

		delete actionByRoot[ rootUuid ];

		if ( knownActionsForClip.length === 0 ) {

			delete actionsByClip[ clipUuid ];

		}

		this._removeInactiveBindingsForAction( action );

	}

	_removeInactiveBindingsForAction( action ) {

		const bindings = action._propertyBindings;

		for ( let i = 0, n = bindings.length; i !== n; ++ i ) {

			const binding = bindings[ i ];

			if ( -- binding.referenceCount === 0 ) {

				this._removeInactiveBinding( binding );

			}

		}

	}

	_lendAction( action ) {

		// [ active actions |  inactive actions  ]
		// [  active actions >| inactive actions ]
		//                 s        a
		//                  <-swap->
		//                 a        s

		const actions = this._actions,
			prevIndex = action._cacheIndex,

			lastActiveIndex = this._nActiveActions ++,

			firstInactiveAction = actions[ lastActiveIndex ];

		action._cacheIndex = lastActiveIndex;
		actions[ lastActiveIndex ] = action;

		firstInactiveAction._cacheIndex = prevIndex;
		actions[ prevIndex ] = firstInactiveAction;

	}

	_takeBackAction( action ) {

		// [  active actions  | inactive actions ]
		// [ active actions |< inactive actions  ]
		//        a        s
		//         <-swap->
		//        s        a

		const actions = this._actions,
			prevIndex = action._cacheIndex,

			firstInactiveIndex = -- this._nActiveActions,

			lastActiveAction = actions[ firstInactiveIndex ];

		action._cacheIndex = firstInactiveIndex;
		actions[ firstInactiveIndex ] = action;

		lastActiveAction._cacheIndex = prevIndex;
		actions[ prevIndex ] = lastActiveAction;

	}

	// Memory management for PropertyMixer objects

	_addInactiveBinding( binding, rootUuid, trackName ) {

		const bindingsByRoot = this._bindingsByRootAndName,
			bindings = this._bindings;

		let bindingByName = bindingsByRoot[ rootUuid ];

		if ( bindingByName === undefined ) {

			bindingByName = {};
			bindingsByRoot[ rootUuid ] = bindingByName;

		}

		bindingByName[ trackName ] = binding;

		binding._cacheIndex = bindings.length;
		bindings.push( binding );

	}

	_removeInactiveBinding( binding ) {

		const bindings = this._bindings,
			propBinding = binding.binding,
			rootUuid = propBinding.rootNode.uuid,
			trackName = propBinding.path,
			bindingsByRoot = this._bindingsByRootAndName,
			bindingByName = bindingsByRoot[ rootUuid ],

			lastInactiveBinding = bindings[ bindings.length - 1 ],
			cacheIndex = binding._cacheIndex;

		lastInactiveBinding._cacheIndex = cacheIndex;
		bindings[ cacheIndex ] = lastInactiveBinding;
		bindings.pop();

		delete bindingByName[ trackName ];

		if ( Object.keys( bindingByName ).length === 0 ) {

			delete bindingsByRoot[ rootUuid ];

		}

	}

	_lendBinding( binding ) {

		const bindings = this._bindings,
			prevIndex = binding._cacheIndex,

			lastActiveIndex = this._nActiveBindings ++,

			firstInactiveBinding = bindings[ lastActiveIndex ];

		binding._cacheIndex = lastActiveIndex;
		bindings[ lastActiveIndex ] = binding;

		firstInactiveBinding._cacheIndex = prevIndex;
		bindings[ prevIndex ] = firstInactiveBinding;

	}

	_takeBackBinding( binding ) {

		const bindings = this._bindings,
			prevIndex = binding._cacheIndex,

			firstInactiveIndex = -- this._nActiveBindings,

			lastActiveBinding = bindings[ firstInactiveIndex ];

		binding._cacheIndex = firstInactiveIndex;
		bindings[ firstInactiveIndex ] = binding;

		lastActiveBinding._cacheIndex = prevIndex;
		bindings[ prevIndex ] = lastActiveBinding;

	}


	// Memory management of Interpolants for weight and time scale

	_lendControlInterpolant() {

		const interpolants = this._controlInterpolants,
			lastActiveIndex = this._nActiveControlInterpolants ++;

		let interpolant = interpolants[ lastActiveIndex ];

		if ( interpolant === undefined ) {

			interpolant = new LinearInterpolant(
				new Float32Array( 2 ), new Float32Array( 2 ),
				1, _controlInterpolantsResultBuffer );

			interpolant.__cacheIndex = lastActiveIndex;
			interpolants[ lastActiveIndex ] = interpolant;

		}

		return interpolant;

	}

	_takeBackControlInterpolant( interpolant ) {

		const interpolants = this._controlInterpolants,
			prevIndex = interpolant.__cacheIndex,

			firstInactiveIndex = -- this._nActiveControlInterpolants,

			lastActiveInterpolant = interpolants[ firstInactiveIndex ];

		interpolant.__cacheIndex = firstInactiveIndex;
		interpolants[ firstInactiveIndex ] = interpolant;

		lastActiveInterpolant.__cacheIndex = prevIndex;
		interpolants[ prevIndex ] = lastActiveInterpolant;

	}

	/**
	 * Returns an instance of {@link AnimationAction} for the passed clip.
	 *
	 * If an action fitting the clip and root parameters doesn't yet exist, it
	 * will be created by this method. Calling this method several times with the
	 * same clip and root parameters always returns the same action.
	 *
	 * @param {AnimationClip|string} clip - An animation clip or alternatively the name of the animation clip.
	 * @param {Object3D} [optionalRoot] - An alternative root object.
	 * @param {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)} [blendMode] - The blend mode.
	 * @return {?AnimationAction} The animation action.
	 */
	clipAction( clip, optionalRoot, blendMode ) {

		const root = optionalRoot || this._root,
			rootUuid = root.uuid;

		let clipObject = typeof clip === 'string' ? AnimationClip.findByName( root, clip ) : clip;

		const clipUuid = clipObject !== null ? clipObject.uuid : clip;

		const actionsForClip = this._actionsByClip[ clipUuid ];
		let prototypeAction = null;

		if ( blendMode === undefined ) {

			if ( clipObject !== null ) {

				blendMode = clipObject.blendMode;

			} else {

				blendMode = NormalAnimationBlendMode;

			}

		}

		if ( actionsForClip !== undefined ) {

			const existingAction = actionsForClip.actionByRoot[ rootUuid ];

			if ( existingAction !== undefined && existingAction.blendMode === blendMode ) {

				return existingAction;

			}

			// we know the clip, so we don't have to parse all
			// the bindings again but can just copy
			prototypeAction = actionsForClip.knownActions[ 0 ];

			// also, take the clip from the prototype action
			if ( clipObject === null )
				clipObject = prototypeAction._clip;

		}

		// clip must be known when specified via string
		if ( clipObject === null ) return null;

		// allocate all resources required to run it
		const newAction = new AnimationAction( this, clipObject, optionalRoot, blendMode );

		this._bindAction( newAction, prototypeAction );

		// and make the action known to the memory manager
		this._addInactiveAction( newAction, clipUuid, rootUuid );

		return newAction;

	}

	/**
	 * Returns an existing animation action for the passed clip.
	 *
	 * @param {AnimationClip|string} clip - An animation clip or alternatively the name of the animation clip.
	 * @param {Object3D} [optionalRoot] - An alternative root object.
	 * @return {?AnimationAction} The animation action. Returns `null` if no action was found.
	 */
	existingAction( clip, optionalRoot ) {

		const root = optionalRoot || this._root,
			rootUuid = root.uuid,

			clipObject = typeof clip === 'string' ?
				AnimationClip.findByName( root, clip ) : clip,

			clipUuid = clipObject ? clipObject.uuid : clip,

			actionsForClip = this._actionsByClip[ clipUuid ];

		if ( actionsForClip !== undefined ) {

			return actionsForClip.actionByRoot[ rootUuid ] || null;

		}

		return null;

	}

	/**
	 * Deactivates all previously scheduled actions on this mixer.
	 *
	 * @return {AnimationMixer} A reference to thi animation mixer.
	 */
	stopAllAction() {

		const actions = this._actions,
			nActions = this._nActiveActions;

		for ( let i = nActions - 1; i >= 0; -- i ) {

			actions[ i ].stop();

		}

		return this;

	}

	/**
	 * Advances the global mixer time and updates the animation.
	 *
	 * This is usually done in the render loop by passing the delta
	 * time from {@link Clock} or {@link Timer}.
	 *
	 * @param {number} deltaTime - The delta time in seconds.
	 * @return {AnimationMixer} A reference to thi animation mixer.
	 */
	update( deltaTime ) {

		deltaTime *= this.timeScale;

		const actions = this._actions,
			nActions = this._nActiveActions,

			time = this.time += deltaTime,
			timeDirection = Math.sign( deltaTime ),

			accuIndex = this._accuIndex ^= 1;

		// run active actions

		for ( let i = 0; i !== nActions; ++ i ) {

			const action = actions[ i ];

			action._update( time, deltaTime, timeDirection, accuIndex );

		}

		// update scene graph

		const bindings = this._bindings,
			nBindings = this._nActiveBindings;

		for ( let i = 0; i !== nBindings; ++ i ) {

			bindings[ i ].apply( accuIndex );

		}

		return this;

	}

	/**
	 * Sets the global mixer to a specific time and updates the animation accordingly.
	 *
	 * This is useful when you need to jump to an exact time in an animation. The
	 * input parameter will be scaled by {@link AnimationMixer#timeScale}
	 *
	 * @param {number} time - The time to set in seconds.
	 * @return {AnimationMixer} A reference to thi animation mixer.
	 */
	setTime( time ) {

		this.time = 0; // Zero out time attribute for AnimationMixer object;
		for ( let i = 0; i < this._actions.length; i ++ ) {

			this._actions[ i ].time = 0; // Zero out time attribute for all associated AnimationAction objects.

		}

		return this.update( time ); // Update used to set exact time. Returns "this" AnimationMixer object.

	}

	/**
	 * Returns this mixer's root object.
	 *
	 * @return {Object3D} The mixer's root object.
	 */
	getRoot() {

		return this._root;

	}

	/**
	 * Deallocates all memory resources for a clip. Before using this method make
	 * sure to call {@link AnimationAction#stop} for all related actions.
	 *
	 * @param {AnimationClip} clip - The clip to uncache.
	 */
	uncacheClip( clip ) {

		const actions = this._actions,
			clipUuid = clip.uuid,
			actionsByClip = this._actionsByClip,
			actionsForClip = actionsByClip[ clipUuid ];

		if ( actionsForClip !== undefined ) {

			// note: just calling _removeInactiveAction would mess up the
			// iteration state and also require updating the state we can
			// just throw away

			const actionsToRemove = actionsForClip.knownActions;

			for ( let i = 0, n = actionsToRemove.length; i !== n; ++ i ) {

				const action = actionsToRemove[ i ];

				this._deactivateAction( action );

				const cacheIndex = action._cacheIndex,
					lastInactiveAction = actions[ actions.length - 1 ];

				action._cacheIndex = null;
				action._byClipCacheIndex = null;

				lastInactiveAction._cacheIndex = cacheIndex;
				actions[ cacheIndex ] = lastInactiveAction;
				actions.pop();

				this._removeInactiveBindingsForAction( action );

			}

			delete actionsByClip[ clipUuid ];

		}

	}

	/**
	 * Deallocates all memory resources for a root object. Before using this
	 * method make sure to call {@link AnimationAction#stop} for all related
	 * actions or alternatively {@link AnimationMixer#stopAllAction} when the
	 * mixer operates on a single root.
	 *
	 * @param {Object3D} root - The root object to uncache.
	 */
	uncacheRoot( root ) {

		const rootUuid = root.uuid,
			actionsByClip = this._actionsByClip;

		for ( const clipUuid in actionsByClip ) {

			const actionByRoot = actionsByClip[ clipUuid ].actionByRoot,
				action = actionByRoot[ rootUuid ];

			if ( action !== undefined ) {

				this._deactivateAction( action );
				this._removeInactiveAction( action );

			}

		}

		const bindingsByRoot = this._bindingsByRootAndName,
			bindingByName = bindingsByRoot[ rootUuid ];

		if ( bindingByName !== undefined ) {

			for ( const trackName in bindingByName ) {

				const binding = bindingByName[ trackName ];
				binding.restoreOriginalState();
				this._removeInactiveBinding( binding );

			}

		}

	}

	/**
	 * Deallocates all memory resources for an action. The action is identified by the
	 * given clip and an optional root object. Before using this method make
	 * sure to call {@link AnimationAction#stop} to deactivate the action.
	 *
	 * @param {AnimationClip|string} clip - An animation clip or alternatively the name of the animation clip.
	 * @param {Object3D} [optionalRoot] - An alternative root object.
	 */
	uncacheAction( clip, optionalRoot ) {

		const action = this.existingAction( clip, optionalRoot );

		if ( action !== null ) {

			this._deactivateAction( action );
			this._removeInactiveAction( action );

		}

	}

}

/**
 * Represents a 3D render target.
 *
 * @augments RenderTarget
 */
class RenderTarget3D extends RenderTarget {

	/**
	 * Constructs a new 3D render target.
	 *
	 * @param {number} [width=1] - The width of the render target.
	 * @param {number} [height=1] - The height of the render target.
	 * @param {number} [depth=1] - The height of the render target.
	 * @param {RenderTarget~Options} [options] - The configuration object.
	 */
	constructor( width = 1, height = 1, depth = 1, options = {} ) {

		super( width, height, options );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isRenderTarget3D = true;

		this.depth = depth;

		/**
		 * Overwritten with a different texture type.
		 *
		 * @type {Data3DTexture}
		 */
		this.texture = new Data3DTexture( null, width, height, depth );
		this._setTextureOptions( options );

		this.texture.isRenderTargetTexture = true;

	}

}

/**
 * Represents a uniform which is a global shader variable. They are passed to shader programs.
 *
 * When declaring a uniform of a {@link ShaderMaterial}, it is declared by value or by object.
 * ```js
 * uniforms: {
 * 	time: { value: 1.0 },
 * 	resolution: new Uniform( new Vector2() )
 * };
 * ```
 * Since this class can only be used in context of {@link ShaderMaterial}, it is only supported
 * in {@link WebGLRenderer}.
 */
class Uniform {

	/**
	 * Constructs a new uniform.
	 *
	 * @param {any} value - The uniform value.
	 */
	constructor( value ) {

		/**
		 * The uniform value.
		 *
		 * @type {any}
		 */
		this.value = value;

	}

	/**
	 * Returns a new uniform with copied values from this instance.
	 * If the value has a `clone()` method, the value is cloned as well.
	 *
	 * @return {Uniform} A clone of this instance.
	 */
	clone() {

		return new Uniform( this.value.clone === undefined ? this.value : this.value.clone() );

	}

}

let _id = 0;

/**
 * A class for managing multiple uniforms in a single group. The renderer will process
 * such a definition as a single UBO.
 *
 * Since this class can only be used in context of {@link ShaderMaterial}, it is only supported
 * in {@link WebGLRenderer}.
 *
 * @augments EventDispatcher
 */
class UniformsGroup extends EventDispatcher {

	/**
	 * Constructs a new uniforms group.
	 */
	constructor() {

		super();

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isUniformsGroup = true;

		/**
		 * The ID of the 3D object.
		 *
		 * @name UniformsGroup#id
		 * @type {number}
		 * @readonly
		 */
		Object.defineProperty( this, 'id', { value: _id ++ } );

		/**
		 * The name of the uniforms group.
		 *
		 * @type {string}
		 */
		this.name = '';

		/**
		 * The buffer usage.
		 *
		 * @type {(StaticDrawUsage|DynamicDrawUsage|StreamDrawUsage|StaticReadUsage|DynamicReadUsage|StreamReadUsage|StaticCopyUsage|DynamicCopyUsage|StreamCopyUsage)}
		 * @default StaticDrawUsage
		 */
		this.usage = StaticDrawUsage;

		/**
		 * An array holding the uniforms.
		 *
		 * @type {Array<Uniform>}
		 */
		this.uniforms = [];

	}

	/**
	 * Adds the given uniform to this uniforms group.
	 *
	 * @param {Uniform} uniform - The uniform to add.
	 * @return {UniformsGroup} A reference to this uniforms group.
	 */
	add( uniform ) {

		this.uniforms.push( uniform );

		return this;

	}

	/**
	 * Removes the given uniform from this uniforms group.
	 *
	 * @param {Uniform} uniform - The uniform to remove.
	 * @return {UniformsGroup} A reference to this uniforms group.
	 */
	remove( uniform ) {

		const index = this.uniforms.indexOf( uniform );

		if ( index !== -1 ) this.uniforms.splice( index, 1 );

		return this;

	}

	/**
	 * Sets the name of this uniforms group.
	 *
	 * @param {string} name - The name to set.
	 * @return {UniformsGroup} A reference to this uniforms group.
	 */
	setName( name ) {

		this.name = name;

		return this;

	}

	/**
	 * Sets the usage of this uniforms group.
	 *
	 * @param {(StaticDrawUsage|DynamicDrawUsage|StreamDrawUsage|StaticReadUsage|DynamicReadUsage|StreamReadUsage|StaticCopyUsage|DynamicCopyUsage|StreamCopyUsage)} value - The usage to set.
	 * @return {UniformsGroup} A reference to this uniforms group.
	 */
	setUsage( value ) {

		this.usage = value;

		return this;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 *
	 * @fires Texture#dispose
	 */
	dispose() {

		this.dispatchEvent( { type: 'dispose' } );

	}

	/**
	 * Copies the values of the given uniforms group to this instance.
	 *
	 * @param {UniformsGroup} source - The uniforms group to copy.
	 * @return {UniformsGroup} A reference to this uniforms group.
	 */
	copy( source ) {

		this.name = source.name;
		this.usage = source.usage;

		const uniformsSource = source.uniforms;

		this.uniforms.length = 0;

		for ( let i = 0, l = uniformsSource.length; i < l; i ++ ) {

			const uniforms = Array.isArray( uniformsSource[ i ] ) ? uniformsSource[ i ] : [ uniformsSource[ i ] ];

			for ( let j = 0; j < uniforms.length; j ++ ) {

				this.uniforms.push( uniforms[ j ].clone() );

			}

		}

		return this;

	}

	/**
	 * Returns a new uniforms group with copied values from this instance.
	 *
	 * @return {UniformsGroup} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

}

/**
 * An instanced version of an interleaved buffer.
 *
 * @augments InterleavedBuffer
 */
class InstancedInterleavedBuffer extends InterleavedBuffer {

	/**
	 * Constructs a new instanced interleaved buffer.
	 *
	 * @param {TypedArray} array - A typed array with a shared buffer storing attribute data.
	 * @param {number} stride - The number of typed-array elements per vertex.
	 * @param {number} [meshPerAttribute=1] - Defines how often a value of this interleaved buffer should be repeated.
	 */
	constructor( array, stride, meshPerAttribute = 1 ) {

		super( array, stride );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isInstancedInterleavedBuffer = true;

		/**
		 * Defines how often a value of this buffer attribute should be repeated,
		 * see {@link InstancedBufferAttribute#meshPerAttribute}.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.meshPerAttribute = meshPerAttribute;

	}

	copy( source ) {

		super.copy( source );

		this.meshPerAttribute = source.meshPerAttribute;

		return this;

	}

	clone( data ) {

		const ib = super.clone( data );

		ib.meshPerAttribute = this.meshPerAttribute;

		return ib;

	}

	toJSON( data ) {

		const json = super.toJSON( data );

		json.isInstancedInterleavedBuffer = true;
		json.meshPerAttribute = this.meshPerAttribute;

		return json;

	}

}

/**
 * An alternative version of a buffer attribute with more control over the VBO.
 *
 * The renderer does not construct a VBO for this kind of attribute. Instead, it uses
 * whatever VBO is passed in constructor and can later be altered via the `buffer` property.
 *
 * The most common use case for this class is when some kind of GPGPU calculation interferes
 * or even produces the VBOs in question.
 *
 * Notice that this class can only be used with {@link WebGLRenderer}.
 */
class GLBufferAttribute {

	/**
	 * Constructs a new GL buffer attribute.
	 *
	 * @param {WebGLBuffer} buffer - The native WebGL buffer.
	 * @param {number} type - The native data type (e.g. `gl.FLOAT`).
	 * @param {number} itemSize - The item size.
	 * @param {number} elementSize - The corresponding size (in bytes) for the given `type` parameter.
	 * @param {number} count - The expected number of vertices in VBO.
	 * @param {boolean} [normalized=false] - Whether the data are normalized or not.
	 */
	constructor( buffer, type, itemSize, elementSize, count, normalized = false ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isGLBufferAttribute = true;

		/**
		 * The name of the buffer attribute.
		 *
		 * @type {string}
		 */
		this.name = '';

		/**
		 * The native WebGL buffer.
		 *
		 * @type {WebGLBuffer}
		 */
		this.buffer = buffer;

		/**
		 * The native data type.
		 *
		 * @type {number}
		 */
		this.type = type;

		/**
		 * The item size, see {@link BufferAttribute#itemSize}.
		 *
		 * @type {number}
		 */
		this.itemSize = itemSize;

		/**
		 * The corresponding size (in bytes) for the given `type` parameter.
		 *
		 * @type {number}
		 */
		this.elementSize = elementSize;

		/**
		 * The expected number of vertices in VBO.
		 *
		 * @type {number}
		 */
		this.count = count;

		/**
		 * Applies to integer data only. Indicates how the underlying data in the buffer maps to
		 * the values in the GLSL code. For instance, if `buffer` contains data of `gl.UNSIGNED_SHORT`,
		 * and `normalized` is `true`, the values `0 - +65535` in the buffer data will be mapped to
		 * `0.0f - +1.0f` in the GLSL attribute. If `normalized` is `false`, the values will be converted
		 * to floats unmodified, i.e. `65535` becomes `65535.0f`.
		 *
		 * @type {boolean}
		 */
		this.normalized = normalized;

		/**
		 * A version number, incremented every time the `needsUpdate` is set to `true`.
		 *
		 * @type {number}
		 */
		this.version = 0;

	}

	/**
	 * Flag to indicate that this attribute has changed and should be re-sent to
	 * the GPU. Set this to `true` when you modify the value of the array.
	 *
	 * @type {number}
	 * @default false
	 * @param {boolean} value
	 */
	set needsUpdate( value ) {

		if ( value === true ) this.version ++;

	}

	/**
	 * Sets the given native WebGL buffer.
	 *
	 * @param {WebGLBuffer} buffer - The buffer to set.
	 * @return {BufferAttribute} A reference to this instance.
	 */
	setBuffer( buffer ) {

		this.buffer = buffer;

		return this;

	}

	/**
	 * Sets the given native data type and element size.
	 *
	 * @param {number} type - The native data type (e.g. `gl.FLOAT`).
	 * @param {number} elementSize - The corresponding size (in bytes) for the given `type` parameter.
	 * @return {BufferAttribute} A reference to this instance.
	 */
	setType( type, elementSize ) {

		this.type = type;
		this.elementSize = elementSize;

		return this;

	}

	/**
	 * Sets the item size.
	 *
	 * @param {number} itemSize - The item size.
	 * @return {BufferAttribute} A reference to this instance.
	 */
	setItemSize( itemSize ) {

		this.itemSize = itemSize;

		return this;

	}

	/**
	 * Sets the count (the expected number of vertices in VBO).
	 *
	 * @param {number} count - The count.
	 * @return {BufferAttribute} A reference to this instance.
	 */
	setCount( count ) {

		this.count = count;

		return this;

	}

}

const _matrix = /*@__PURE__*/ new Matrix4();

/**
 * This class is designed to assist with raycasting. Raycasting is used for
 * mouse picking (working out what objects in the 3d space the mouse is over)
 * amongst other things.
 */
class Raycaster {

	/**
	 * Constructs a new raycaster.
	 *
	 * @param {Vector3} origin - The origin vector where the ray casts from.
	 * @param {Vector3} direction - The (normalized) direction vector that gives direction to the ray.
	 * @param {number} [near=0] - All results returned are further away than near. Near can't be negative.
	 * @param {number} [far=Infinity] - All results returned are closer than far. Far can't be lower than near.
	 */
	constructor( origin, direction, near = 0, far = Infinity ) {

		/**
		 * The ray used for raycasting.
		 *
		 * @type {Ray}
		 */
		this.ray = new Ray( origin, direction );

		/**
		 * All results returned are further away than near. Near can't be negative.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.near = near;

		/**
		 * All results returned are further away than near. Near can't be negative.
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.far = far;

		/**
		 * The camera to use when raycasting against view-dependent objects such as
		 * billboarded objects like sprites. This field can be set manually or
		 * is set when calling `setFromCamera()`.
		 *
		 * @type {?Camera}
		 * @default null
		 */
		this.camera = null;

		/**
		 * Allows to selectively ignore 3D objects when performing intersection tests.
		 * The following code example ensures that only 3D objects on layer `1` will be
		 * honored by raycaster.
		 * ```js
		 * raycaster.layers.set( 1 );
		 * object.layers.enable( 1 );
		 * ```
		 *
		 * @type {Layers}
		 */
		this.layers = new Layers();


		/**
		 * A parameter object that configures the raycasting. It has the structure:
		 *
		 * ```
		 * {
		 * 	Mesh: {},
		 * 	Line: { threshold: 1 },
		 * 	LOD: {},
		 * 	Points: { threshold: 1 },
		 * 	Sprite: {}
		 * }
		 * ```
		 * Where `threshold` is the precision of the raycaster when intersecting objects, in world units.
		 *
		 * @type {Object}
		 */
		this.params = {
			Mesh: {},
			Line: { threshold: 1 },
			LOD: {},
			Points: { threshold: 1 },
			Sprite: {}
		};

	}

	/**
	 * Updates the ray with a new origin and direction by copying the values from the arguments.
	 *
	 * @param {Vector3} origin - The origin vector where the ray casts from.
	 * @param {Vector3} direction - The (normalized) direction vector that gives direction to the ray.
	 */
	set( origin, direction ) {

		// direction is assumed to be normalized (for accurate distance calculations)

		this.ray.set( origin, direction );

	}

	/**
	 * Uses the given coordinates and camera to compute a new origin and direction for the internal ray.
	 *
	 * @param {Vector2} coords - 2D coordinates of the mouse, in normalized device coordinates (NDC).
	 * X and Y components should be between `-1` and `1`.
	 * @param {Camera} camera - The camera from which the ray should originate.
	 */
	setFromCamera( coords, camera ) {

		if ( camera.isPerspectiveCamera ) {

			this.ray.origin.setFromMatrixPosition( camera.matrixWorld );
			this.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( this.ray.origin ).normalize();
			this.camera = camera;

		} else if ( camera.isOrthographicCamera ) {

			this.ray.origin.set( coords.x, coords.y, ( camera.near + camera.far ) / ( camera.near - camera.far ) ).unproject( camera ); // set origin in plane of camera
			this.ray.direction.set( 0, 0, -1 ).transformDirection( camera.matrixWorld );
			this.camera = camera;

		} else {

			console.error( 'THREE.Raycaster: Unsupported camera type: ' + camera.type );

		}

	}

	/**
	 * Uses the given WebXR controller to compute a new origin and direction for the internal ray.
	 *
	 * @param {WebXRController} controller - The controller to copy the position and direction from.
	 * @return {Raycaster} A reference to this raycaster.
	 */
	setFromXRController( controller ) {

		_matrix.identity().extractRotation( controller.matrixWorld );

		this.ray.origin.setFromMatrixPosition( controller.matrixWorld );
		this.ray.direction.set( 0, 0, -1 ).applyMatrix4( _matrix );

		return this;

	}

	/**
	 * The intersection point of a raycaster intersection test.
	 * @typedef {Object} Raycaster~Intersection
	 * @property {number} distance - The distance from the ray's origin to the intersection point.
	 * @property {number} distanceToRay -  Some 3D objects e.g. {@link Points} provide the distance of the
	 * intersection to the nearest point on the ray. For other objects it will be `undefined`.
	 * @property {Vector3} point - The intersection point, in world coordinates.
	 * @property {Object} face - The face that has been intersected.
	 * @property {number} faceIndex - The face index.
	 * @property {Object3D} object - The 3D object that has been intersected.
	 * @property {Vector2} uv - U,V coordinates at point of intersection.
	 * @property {Vector2} uv1 - Second set of U,V coordinates at point of intersection.
	 * @property {Vector3} uv1 - Interpolated normal vector at point of intersection.
	 * @property {number} instanceId - The index number of the instance where the ray
	 * intersects the {@link InstancedMesh}.
	 */

	/**
	 * Checks all intersection between the ray and the object with or without the
	 * descendants. Intersections are returned sorted by distance, closest first.
	 *
	 * `Raycaster` delegates to the `raycast()` method of the passed 3D object, when
	 * evaluating whether the ray intersects the object or not. This allows meshes to respond
	 * differently to ray casting than lines or points.
	 *
	 * Note that for meshes, faces must be pointed towards the origin of the ray in order
	 * to be detected; intersections of the ray passing through the back of a face will not
	 * be detected. To raycast against both faces of an object, you'll want to set  {@link Material#side}
	 * to `THREE.DoubleSide`.
	 *
	 * @param {Object3D} object - The 3D object to check for intersection with the ray.
	 * @param {boolean} [recursive=true] - If set to `true`, it also checks all descendants.
	 * Otherwise it only checks intersection with the object.
	 * @param {Array<Raycaster~Intersection>} [intersects=[]] The target array that holds the result of the method.
	 * @return {Array<Raycaster~Intersection>} An array holding the intersection points.
	 */
	intersectObject( object, recursive = true, intersects = [] ) {

		intersect( object, this, intersects, recursive );

		intersects.sort( ascSort );

		return intersects;

	}

	/**
	 * Checks all intersection between the ray and the objects with or without
	 * the descendants. Intersections are returned sorted by distance, closest first.
	 *
	 * @param {Array<Object3D>} objects - The 3D objects to check for intersection with the ray.
	 * @param {boolean} [recursive=true] - If set to `true`, it also checks all descendants.
	 * Otherwise it only checks intersection with the object.
	 * @param {Array<Raycaster~Intersection>} [intersects=[]] The target array that holds the result of the method.
	 * @return {Array<Raycaster~Intersection>} An array holding the intersection points.
	 */
	intersectObjects( objects, recursive = true, intersects = [] ) {

		for ( let i = 0, l = objects.length; i < l; i ++ ) {

			intersect( objects[ i ], this, intersects, recursive );

		}

		intersects.sort( ascSort );

		return intersects;

	}

}

function ascSort( a, b ) {

	return a.distance - b.distance;

}

function intersect( object, raycaster, intersects, recursive ) {

	let propagate = true;

	if ( object.layers.test( raycaster.layers ) ) {

		const result = object.raycast( raycaster, intersects );

		if ( result === false ) propagate = false;

	}

	if ( propagate === true && recursive === true ) {

		const children = object.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			intersect( children[ i ], raycaster, intersects, true );

		}

	}

}

/**
 * This class is an alternative to {@link Clock} with a different API design and behavior.
 * The goal is to avoid the conceptual flaws that became apparent in `Clock` over time.
 *
 * - `Timer` has an `update()` method that updates its internal state. That makes it possible to
 * call `getDelta()` and `getElapsed()` multiple times per simulation step without getting different values.
 * - The class can make use of the Page Visibility API to avoid large time delta values when the app
 * is inactive (e.g. tab switched or browser hidden).
 *
 * ```js
 * const timer = new Timer();
 * timer.connect( document ); // use Page Visibility API
 * ```
 */
class Timer {

	/**
	 * Constructs a new timer.
	 */
	constructor() {

		this._previousTime = 0;
		this._currentTime = 0;
		this._startTime = performance.now();

		this._delta = 0;
		this._elapsed = 0;

		this._timescale = 1;

		this._document = null;
		this._pageVisibilityHandler = null;

	}

	/**
	 * Connect the timer to the given document.Calling this method is not mandatory to
	 * use the timer but enables the usage of the Page Visibility API to avoid large time
	 * delta values.
	 *
	 * @param {Document} document - The document.
	 */
	connect( document ) {

		this._document = document;

		// use Page Visibility API to avoid large time delta values

		if ( document.hidden !== undefined ) {

			this._pageVisibilityHandler = handleVisibilityChange.bind( this );

			document.addEventListener( 'visibilitychange', this._pageVisibilityHandler, false );

		}

	}

	/**
	 * Disconnects the timer from the DOM and also disables the usage of the Page Visibility API.
	 */
	disconnect() {

		if ( this._pageVisibilityHandler !== null ) {

			this._document.removeEventListener( 'visibilitychange', this._pageVisibilityHandler );
			this._pageVisibilityHandler = null;

		}

		this._document = null;

	}

	/**
	 * Returns the time delta in seconds.
	 *
	 * @return {number} The time delta in second.
	 */
	getDelta() {

		return this._delta / 1000;

	}

	/**
	 * Returns the elapsed time in seconds.
	 *
	 * @return {number} The elapsed time in second.
	 */
	getElapsed() {

		return this._elapsed / 1000;

	}

	/**
	 * Returns the timescale.
	 *
	 * @return {number} The timescale.
	 */
	getTimescale() {

		return this._timescale;

	}

	/**
	 * Sets the given timescale which scale the time delta computation
	 * in `update()`.
	 *
	 * @param {number} timescale - The timescale to set.
	 * @return {Timer} A reference to this timer.
	 */
	setTimescale( timescale ) {

		this._timescale = timescale;

		return this;

	}

	/**
	 * Resets the time computation for the current simulation step.
	 *
	 * @return {Timer} A reference to this timer.
	 */
	reset() {

		this._currentTime = performance.now() - this._startTime;

		return this;

	}

	/**
	 * Can be used to free all internal resources. Usually called when
	 * the timer instance isn't required anymore.
	 */
	dispose() {

		this.disconnect();

	}

	/**
	 * Updates the internal state of the timer. This method should be called
	 * once per simulation step and before you perform queries against the timer
	 * (e.g. via `getDelta()`).
	 *
	 * @param {number} timestamp - The current time in milliseconds. Can be obtained
	 * from the `requestAnimationFrame` callback argument. If not provided, the current
	 * time will be determined with `performance.now`.
	 * @return {Timer} A reference to this timer.
	 */
	update( timestamp ) {

		if ( this._pageVisibilityHandler !== null && this._document.hidden === true ) {

			this._delta = 0;

		} else {

			this._previousTime = this._currentTime;
			this._currentTime = ( timestamp !== undefined ? timestamp : performance.now() ) - this._startTime;

			this._delta = ( this._currentTime - this._previousTime ) * this._timescale;
			this._elapsed += this._delta; // _elapsed is the accumulation of all previous deltas

		}

		return this;

	}

}

function handleVisibilityChange() {

	if ( this._document.hidden === false ) this.reset();

}

/**
 * This class can be used to represent points in 3D space as
 * [Spherical coordinates]{@link https://en.wikipedia.org/wiki/Spherical_coordinate_system}.
 */
class Spherical {

	/**
	 * Constructs a new spherical.
	 *
	 * @param {number} [radius=1] - The radius, or the Euclidean distance (straight-line distance) from the point to the origin.
	 * @param {number} [phi=0] - The polar angle in radians from the y (up) axis.
	 * @param {number} [theta=0] - The equator/azimuthal angle in radians around the y (up) axis.
	 */
	constructor( radius = 1, phi = 0, theta = 0 ) {

		/**
		 * The radius, or the Euclidean distance (straight-line distance) from the point to the origin.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.radius = radius;

		/**
		 * The polar angle in radians from the y (up) axis.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.phi = phi;

		/**
		 * The equator/azimuthal angle in radians around the y (up) axis.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.theta = theta;

	}

	/**
	 * Sets the spherical components by copying the given values.
	 *
	 * @param {number} radius - The radius.
	 * @param {number} phi - The polar angle.
	 * @param {number} theta - The azimuthal angle.
	 * @return {Spherical} A reference to this spherical.
	 */
	set( radius, phi, theta ) {

		this.radius = radius;
		this.phi = phi;
		this.theta = theta;

		return this;

	}

	/**
	 * Copies the values of the given spherical to this instance.
	 *
	 * @param {Spherical} other - The spherical to copy.
	 * @return {Spherical} A reference to this spherical.
	 */
	copy( other ) {

		this.radius = other.radius;
		this.phi = other.phi;
		this.theta = other.theta;

		return this;

	}

	/**
	 * Restricts the polar angle [page:.phi phi] to be between `0.000001` and pi -
	 * `0.000001`.
	 *
	 * @return {Spherical} A reference to this spherical.
	 */
	makeSafe() {

		const EPS = 0.000001;
		this.phi = clamp( this.phi, EPS, Math.PI - EPS );

		return this;

	}

	/**
	 * Sets the spherical components from the given vector which is assumed to hold
	 * Cartesian coordinates.
	 *
	 * @param {Vector3} v - The vector to set.
	 * @return {Spherical} A reference to this spherical.
	 */
	setFromVector3( v ) {

		return this.setFromCartesianCoords( v.x, v.y, v.z );

	}

	/**
	 * Sets the spherical components from the given Cartesian coordinates.
	 *
	 * @param {number} x - The x value.
	 * @param {number} y - The y value.
	 * @param {number} z - The z value.
	 * @return {Spherical} A reference to this spherical.
	 */
	setFromCartesianCoords( x, y, z ) {

		this.radius = Math.sqrt( x * x + y * y + z * z );

		if ( this.radius === 0 ) {

			this.theta = 0;
			this.phi = 0;

		} else {

			this.theta = Math.atan2( x, z );
			this.phi = Math.acos( clamp( y / this.radius, -1, 1 ) );

		}

		return this;

	}

	/**
	 * Returns a new spherical with copied values from this instance.
	 *
	 * @return {Spherical} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

}

/**
 * This class can be used to represent points in 3D space as
 * [Cylindrical coordinates]{@link https://en.wikipedia.org/wiki/Cylindrical_coordinate_system}.
 */
class Cylindrical {

	/**
	 * Constructs a new cylindrical.
	 *
	 * @param {number} [radius=1] - The distance from the origin to a point in the x-z plane.
	 * @param {number} [theta=0] - A counterclockwise angle in the x-z plane measured in radians from the positive z-axis.
	 * @param {number} [y=0] - The height above the x-z plane.
	 */
	constructor( radius = 1, theta = 0, y = 0 ) {

		/**
		 * The distance from the origin to a point in the x-z plane.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.radius = radius;

		/**
		 * A counterclockwise angle in the x-z plane measured in radians from the positive z-axis.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.theta = theta;

		/**
		 * The height above the x-z plane.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.y = y;

	}

	/**
	 * Sets the cylindrical components by copying the given values.
	 *
	 * @param {number} radius - The radius.
	 * @param {number} theta - The theta angle.
	 * @param {number} y - The height value.
	 * @return {Cylindrical} A reference to this cylindrical.
	 */
	set( radius, theta, y ) {

		this.radius = radius;
		this.theta = theta;
		this.y = y;

		return this;

	}

	/**
	 * Copies the values of the given cylindrical to this instance.
	 *
	 * @param {Cylindrical} other - The cylindrical to copy.
	 * @return {Cylindrical} A reference to this cylindrical.
	 */
	copy( other ) {

		this.radius = other.radius;
		this.theta = other.theta;
		this.y = other.y;

		return this;

	}

	/**
	 * Sets the cylindrical components from the given vector which is assumed to hold
	 * Cartesian coordinates.
	 *
	 * @param {Vector3} v - The vector to set.
	 * @return {Cylindrical} A reference to this cylindrical.
	 */
	setFromVector3( v ) {

		return this.setFromCartesianCoords( v.x, v.y, v.z );

	}

	/**
	 * Sets the cylindrical components from the given Cartesian coordinates.
	 *
	 * @param {number} x - The x value.
	 * @param {number} y - The x value.
	 * @param {number} z - The x value.
	 * @return {Cylindrical} A reference to this cylindrical.
	 */
	setFromCartesianCoords( x, y, z ) {

		this.radius = Math.sqrt( x * x + z * z );
		this.theta = Math.atan2( x, z );
		this.y = y;

		return this;

	}

	/**
	 * Returns a new cylindrical with copied values from this instance.
	 *
	 * @return {Cylindrical} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

}

/**
 * Represents a 2x2 matrix.
 *
 * A Note on Row-Major and Column-Major Ordering:
 *
 * The constructor and {@link Matrix2#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix2#elements} array in column-major order.
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix2();
 * m.set( 11, 12,
 *        21, 22 );
 * ```
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21,
 *                12, 22 ];
 * ```
 * and internally all calculations are performed using column-major ordering.
 * However, as the actual ordering makes no difference mathematically and
 * most people are used to thinking about matrices in row-major order, the
 * three.js documentation shows matrices in row-major order. Just bear in
 * mind that if you are reading the source code, you'll have to take the
 * transpose of any matrices outlined here to make sense of the calculations.
 */
class Matrix2 {

	/**
	 * Constructs a new 2x2 matrix. The arguments are supposed to be
	 * in row-major order. If no arguments are provided, the constructor
	 * initializes the matrix as an identity matrix.
	 *
	 * @param {number} [n11] - 1-1 matrix element.
	 * @param {number} [n12] - 1-2 matrix element.
	 * @param {number} [n21] - 2-1 matrix element.
	 * @param {number} [n22] - 2-2 matrix element.
	 */
	constructor( n11, n12, n21, n22 ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		Matrix2.prototype.isMatrix2 = true;

		/**
		 * A column-major list of matrix values.
		 *
		 * @type {Array<number>}
		 */
		this.elements = [
			1, 0,
			0, 1,
		];

		if ( n11 !== undefined ) {

			this.set( n11, n12, n21, n22 );

		}

	}

	/**
	 * Sets this matrix to the 2x2 identity matrix.
	 *
	 * @return {Matrix2} A reference to this matrix.
	 */
	identity() {

		this.set(
			1, 0,
			0, 1,
		);

		return this;

	}

	/**
	 * Sets the elements of the matrix from the given array.
	 *
	 * @param {Array<number>} array - The matrix elements in column-major order.
	 * @param {number} [offset=0] - Index of the first element in the array.
	 * @return {Matrix2} A reference to this matrix.
	 */
	fromArray( array, offset = 0 ) {

		for ( let i = 0; i < 4; i ++ ) {

			this.elements[ i ] = array[ i + offset ];

		}

		return this;

	}

	/**
	 * Sets the elements of the matrix.The arguments are supposed to be
	 * in row-major order.
	 *
	 * @param {number} n11 - 1-1 matrix element.
	 * @param {number} n12 - 1-2 matrix element.
	 * @param {number} n21 - 2-1 matrix element.
	 * @param {number} n22 - 2-2 matrix element.
	 * @return {Matrix2} A reference to this matrix.
	 */
	set( n11, n12, n21, n22 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 2 ] = n12;
		te[ 1 ] = n21; te[ 3 ] = n22;

		return this;

	}

}

const _vector$4 = /*@__PURE__*/ new Vector2();

/**
 * Represents an axis-aligned bounding box (AABB) in 2D space.
 */
class Box2 {

	/**
	 * Constructs a new bounding box.
	 *
	 * @param {Vector2} [min=(Infinity,Infinity)] - A vector representing the lower boundary of the box.
	 * @param {Vector2} [max=(-Infinity,-Infinity)] - A vector representing the upper boundary of the box.
	 */
	constructor( min = new Vector2( + Infinity, + Infinity ), max = new Vector2( - Infinity, - Infinity ) ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isBox2 = true;

		/**
		 * The lower boundary of the box.
		 *
		 * @type {Vector2}
		 */
		this.min = min;

		/**
		 * The upper boundary of the box.
		 *
		 * @type {Vector2}
		 */
		this.max = max;

	}

	/**
	 * Sets the lower and upper boundaries of this box.
	 * Please note that this method only copies the values from the given objects.
	 *
	 * @param {Vector2} min - The lower boundary of the box.
	 * @param {Vector2} max - The upper boundary of the box.
	 * @return {Box2} A reference to this bounding box.
	 */
	set( min, max ) {

		this.min.copy( min );
		this.max.copy( max );

		return this;

	}

	/**
	 * Sets the upper and lower bounds of this box so it encloses the position data
	 * in the given array.
	 *
	 * @param {Array<Vector2>} points - An array holding 2D position data as instances of {@link Vector2}.
	 * @return {Box2} A reference to this bounding box.
	 */
	setFromPoints( points ) {

		this.makeEmpty();

		for ( let i = 0, il = points.length; i < il; i ++ ) {

			this.expandByPoint( points[ i ] );

		}

		return this;

	}

	/**
	 * Centers this box on the given center vector and sets this box's width, height and
	 * depth to the given size values.
	 *
	 * @param {Vector2} center - The center of the box.
	 * @param {Vector2} size - The x and y dimensions of the box.
	 * @return {Box2} A reference to this bounding box.
	 */
	setFromCenterAndSize( center, size ) {

		const halfSize = _vector$4.copy( size ).multiplyScalar( 0.5 );
		this.min.copy( center ).sub( halfSize );
		this.max.copy( center ).add( halfSize );

		return this;

	}

	/**
	 * Returns a new box with copied values from this instance.
	 *
	 * @return {Box2} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	 * Copies the values of the given box to this instance.
	 *
	 * @param {Box2} box - The box to copy.
	 * @return {Box2} A reference to this bounding box.
	 */
	copy( box ) {

		this.min.copy( box.min );
		this.max.copy( box.max );

		return this;

	}

	/**
	 * Makes this box empty which means in encloses a zero space in 2D.
	 *
	 * @return {Box2} A reference to this bounding box.
	 */
	makeEmpty() {

		this.min.x = this.min.y = + Infinity;
		this.max.x = this.max.y = - Infinity;

		return this;

	}

	/**
	 * Returns true if this box includes zero points within its bounds.
	 * Note that a box with equal lower and upper bounds still includes one
	 * point, the one both bounds share.
	 *
	 * @return {boolean} Whether this box is empty or not.
	 */
	isEmpty() {

		// this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes

		return ( this.max.x < this.min.x ) || ( this.max.y < this.min.y );

	}

	/**
	 * Returns the center point of this box.
	 *
	 * @param {Vector2} target - The target vector that is used to store the method's result.
	 * @return {Vector2} The center point.
	 */
	getCenter( target ) {

		return this.isEmpty() ? target.set( 0, 0 ) : target.addVectors( this.min, this.max ).multiplyScalar( 0.5 );

	}

	/**
	 * Returns the dimensions of this box.
	 *
	 * @param {Vector2} target - The target vector that is used to store the method's result.
	 * @return {Vector2} The size.
	 */
	getSize( target ) {

		return this.isEmpty() ? target.set( 0, 0 ) : target.subVectors( this.max, this.min );

	}

	/**
	 * Expands the boundaries of this box to include the given point.
	 *
	 * @param {Vector2} point - The point that should be included by the bounding box.
	 * @return {Box2} A reference to this bounding box.
	 */
	expandByPoint( point ) {

		this.min.min( point );
		this.max.max( point );

		return this;

	}

	/**
	 * Expands this box equilaterally by the given vector. The width of this
	 * box will be expanded by the x component of the vector in both
	 * directions. The height of this box will be expanded by the y component of
	 * the vector in both directions.
	 *
	 * @param {Vector2} vector - The vector that should expand the bounding box.
	 * @return {Box2} A reference to this bounding box.
	 */
	expandByVector( vector ) {

		this.min.sub( vector );
		this.max.add( vector );

		return this;

	}

	/**
	 * Expands each dimension of the box by the given scalar. If negative, the
	 * dimensions of the box will be contracted.
	 *
	 * @param {number} scalar - The scalar value that should expand the bounding box.
	 * @return {Box2} A reference to this bounding box.
	 */
	expandByScalar( scalar ) {

		this.min.addScalar( - scalar );
		this.max.addScalar( scalar );

		return this;

	}

	/**
	 * Returns `true` if the given point lies within or on the boundaries of this box.
	 *
	 * @param {Vector2} point - The point to test.
	 * @return {boolean} Whether the bounding box contains the given point or not.
	 */
	containsPoint( point ) {

		return point.x >= this.min.x && point.x <= this.max.x &&
			point.y >= this.min.y && point.y <= this.max.y;

	}

	/**
	 * Returns `true` if this bounding box includes the entirety of the given bounding box.
	 * If this box and the given one are identical, this function also returns `true`.
	 *
	 * @param {Box2} box - The bounding box to test.
	 * @return {boolean} Whether the bounding box contains the given bounding box or not.
	 */
	containsBox( box ) {

		return this.min.x <= box.min.x && box.max.x <= this.max.x &&
			this.min.y <= box.min.y && box.max.y <= this.max.y;

	}

	/**
	 * Returns a point as a proportion of this box's width and height.
	 *
	 * @param {Vector2} point - A point in 2D space.
	 * @param {Vector2} target - The target vector that is used to store the method's result.
	 * @return {Vector2} A point as a proportion of this box's width and height.
	 */
	getParameter( point, target ) {

		// This can potentially have a divide by zero if the box
		// has a size dimension of 0.

		return target.set(
			( point.x - this.min.x ) / ( this.max.x - this.min.x ),
			( point.y - this.min.y ) / ( this.max.y - this.min.y )
		);

	}

	/**
	 * Returns `true` if the given bounding box intersects with this bounding box.
	 *
	 * @param {Box2} box - The bounding box to test.
	 * @return {boolean} Whether the given bounding box intersects with this bounding box.
	 */
	intersectsBox( box ) {

		// using 4 splitting planes to rule out intersections

		return box.max.x >= this.min.x && box.min.x <= this.max.x &&
			box.max.y >= this.min.y && box.min.y <= this.max.y;

	}

	/**
	 * Clamps the given point within the bounds of this box.
	 *
	 * @param {Vector2} point - The point to clamp.
	 * @param {Vector2} target - The target vector that is used to store the method's result.
	 * @return {Vector2} The clamped point.
	 */
	clampPoint( point, target ) {

		return target.copy( point ).clamp( this.min, this.max );

	}

	/**
	 * Returns the euclidean distance from any edge of this box to the specified point. If
	 * the given point lies inside of this box, the distance will be `0`.
	 *
	 * @param {Vector2} point - The point to compute the distance to.
	 * @return {number} The euclidean distance.
	 */
	distanceToPoint( point ) {

		return this.clampPoint( point, _vector$4 ).distanceTo( point );

	}

	/**
	 * Computes the intersection of this bounding box and the given one, setting the upper
	 * bound of this box to the lesser of the two boxes' upper bounds and the
	 * lower bound of this box to the greater of the two boxes' lower bounds. If
	 * there's no overlap, makes this box empty.
	 *
	 * @param {Box2} box - The bounding box to intersect with.
	 * @return {Box2} A reference to this bounding box.
	 */
	intersect( box ) {

		this.min.max( box.min );
		this.max.min( box.max );

		if ( this.isEmpty() ) this.makeEmpty();

		return this;

	}

	/**
	 * Computes the union of this box and another and the given one, setting the upper
	 * bound of this box to the greater of the two boxes' upper bounds and the
	 * lower bound of this box to the lesser of the two boxes' lower bounds.
	 *
	 * @param {Box2} box - The bounding box that will be unioned with this instance.
	 * @return {Box2} A reference to this bounding box.
	 */
	union( box ) {

		this.min.min( box.min );
		this.max.max( box.max );

		return this;

	}

	/**
	 * Adds the given offset to both the upper and lower bounds of this bounding box,
	 * effectively moving it in 2D space.
	 *
	 * @param {Vector2} offset - The offset that should be used to translate the bounding box.
	 * @return {Box2} A reference to this bounding box.
	 */
	translate( offset ) {

		this.min.add( offset );
		this.max.add( offset );

		return this;

	}

	/**
	 * Returns `true` if this bounding box is equal with the given one.
	 *
	 * @param {Box2} box - The box to test for equality.
	 * @return {boolean} Whether this bounding box is equal with the given one.
	 */
	equals( box ) {

		return box.min.equals( this.min ) && box.max.equals( this.max );

	}

}

const _startP = /*@__PURE__*/ new Vector3();
const _startEnd = /*@__PURE__*/ new Vector3();

const _d1 = /*@__PURE__*/ new Vector3();
const _d2 = /*@__PURE__*/ new Vector3();
const _r = /*@__PURE__*/ new Vector3();
const _c1 = /*@__PURE__*/ new Vector3();
const _c2 = /*@__PURE__*/ new Vector3();

/**
 * An analytical line segment in 3D space represented by a start and end point.
 */
class Line3 {

	/**
	 * Constructs a new line segment.
	 *
	 * @param {Vector3} [start=(0,0,0)] - Start of the line segment.
	 * @param {Vector3} [end=(0,0,0)] - End of the line segment.
	 */
	constructor( start = new Vector3(), end = new Vector3() ) {

		/**
		 * Start of the line segment.
		 *
		 * @type {Vector3}
		 */
		this.start = start;

		/**
		 * End of the line segment.
		 *
		 * @type {Vector3}
		 */
		this.end = end;

	}

	/**
	 * Sets the start and end values by copying the given vectors.
	 *
	 * @param {Vector3} start - The start point.
	 * @param {Vector3} end - The end point.
	 * @return {Line3} A reference to this line segment.
	 */
	set( start, end ) {

		this.start.copy( start );
		this.end.copy( end );

		return this;

	}

	/**
	 * Copies the values of the given line segment to this instance.
	 *
	 * @param {Line3} line - The line segment to copy.
	 * @return {Line3} A reference to this line segment.
	 */
	copy( line ) {

		this.start.copy( line.start );
		this.end.copy( line.end );

		return this;

	}

	/**
	 * Returns the center of the line segment.
	 *
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The center point.
	 */
	getCenter( target ) {

		return target.addVectors( this.start, this.end ).multiplyScalar( 0.5 );

	}

	/**
	 * Returns the delta vector of the line segment's start and end point.
	 *
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The delta vector.
	 */
	delta( target ) {

		return target.subVectors( this.end, this.start );

	}

	/**
	 * Returns the squared Euclidean distance between the line' start and end point.
	 *
	 * @return {number} The squared Euclidean distance.
	 */
	distanceSq() {

		return this.start.distanceToSquared( this.end );

	}

	/**
	 * Returns the Euclidean distance between the line' start and end point.
	 *
	 * @return {number} The Euclidean distance.
	 */
	distance() {

		return this.start.distanceTo( this.end );

	}

	/**
	 * Returns a vector at a certain position along the line segment.
	 *
	 * @param {number} t - A value between `[0,1]` to represent a position along the line segment.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The delta vector.
	 */
	at( t, target ) {

		return this.delta( target ).multiplyScalar( t ).add( this.start );

	}

	/**
	 * Returns a point parameter based on the closest point as projected on the line segment.
	 *
	 * @param {Vector3} point - The point for which to return a point parameter.
	 * @param {boolean} clampToLine - Whether to clamp the result to the range `[0,1]` or not.
	 * @return {number} The point parameter.
	 */
	closestPointToPointParameter( point, clampToLine ) {

		_startP.subVectors( point, this.start );
		_startEnd.subVectors( this.end, this.start );

		const startEnd2 = _startEnd.dot( _startEnd );
		const startEnd_startP = _startEnd.dot( _startP );

		let t = startEnd_startP / startEnd2;

		if ( clampToLine ) {

			t = clamp( t, 0, 1 );

		}

		return t;

	}

	/**
	 * Returns the closest point on the line for a given point.
	 *
	 * @param {Vector3} point - The point to compute the closest point on the line for.
	 * @param {boolean} clampToLine - Whether to clamp the result to the range `[0,1]` or not.
	 * @param {Vector3} target - The target vector that is used to store the method's result.
	 * @return {Vector3} The closest point on the line.
	 */
	closestPointToPoint( point, clampToLine, target ) {

		const t = this.closestPointToPointParameter( point, clampToLine );

		return this.delta( target ).multiplyScalar( t ).add( this.start );

	}

	/**
	 * Returns the closest squared distance between this line segment and the given one.
	 *
	 * @param {Line3} line - The line segment to compute the closest squared distance to.
	 * @param {Vector3} [c1] - The closest point on this line segment.
	 * @param {Vector3} [c2] - The closest point on the given line segment.
	 * @return {number} The squared distance between this line segment and the given one.
	 */
	distanceSqToLine3( line, c1 = _c1, c2 = _c2 ) {

		// from Real-Time Collision Detection by Christer Ericson, chapter 5.1.9

		// Computes closest points C1 and C2 of S1(s)=P1+s*(Q1-P1) and
		// S2(t)=P2+t*(Q2-P2), returning s and t. Function result is squared
		// distance between between S1(s) and S2(t)

		const EPSILON = 1e-8 * 1e-8; // must be squared since we compare squared length
		let s, t;

		const p1 = this.start;
		const p2 = line.start;
		const q1 = this.end;
		const q2 = line.end;

		_d1.subVectors( q1, p1 ); // Direction vector of segment S1
		_d2.subVectors( q2, p2 ); // Direction vector of segment S2
		_r.subVectors( p1, p2 );

		const a = _d1.dot( _d1 ); // Squared length of segment S1, always nonnegative
		const e = _d2.dot( _d2 ); // Squared length of segment S2, always nonnegative
		const f = _d2.dot( _r );

		// Check if either or both segments degenerate into points

		if ( a <= EPSILON && e <= EPSILON ) {

			// Both segments degenerate into points

			c1.copy( p1 );
			c2.copy( p2 );

			c1.sub( c2 );

			return c1.dot( c1 );

		}

		if ( a <= EPSILON ) {

			// First segment degenerates into a point

			s = 0;
			t = f / e; // s = 0 => t = (b*s + f) / e = f / e
			t = clamp( t, 0, 1 );


		} else {

			const c = _d1.dot( _r );

			if ( e <= EPSILON ) {

				// Second segment degenerates into a point

				t = 0;
				s = clamp( - c / a, 0, 1 ); // t = 0 => s = (b*t - c) / a = -c / a

			} else {

				// The general nondegenerate case starts here

				const b = _d1.dot( _d2 );
				const denom = a * e - b * b; // Always nonnegative

				// If segments not parallel, compute closest point on L1 to L2 and
				// clamp to segment S1. Else pick arbitrary s (here 0)

				if ( denom !== 0 ) {

					s = clamp( ( b * f - c * e ) / denom, 0, 1 );

				} else {

					s = 0;

				}

				// Compute point on L2 closest to S1(s) using
				// t = Dot((P1 + D1*s) - P2,D2) / Dot(D2,D2) = (b*s + f) / e

				t = ( b * s + f ) / e;

				// If t in [0,1] done. Else clamp t, recompute s for the new value
				// of t using s = Dot((P2 + D2*t) - P1,D1) / Dot(D1,D1)= (t*b - c) / a
				// and clamp s to [0, 1]

				if ( t < 0 ) {

					t = 0.;
					s = clamp( - c / a, 0, 1 );

				} else if ( t > 1 ) {

					t = 1;
					s = clamp( ( b - c ) / a, 0, 1 );

				}

			}

		}

		c1.copy( p1 ).add( _d1.multiplyScalar( s ) );
		c2.copy( p2 ).add( _d2.multiplyScalar( t ) );

		c1.sub( c2 );

		return c1.dot( c1 );

	}

	/**
	 * Applies a 4x4 transformation matrix to this line segment.
	 *
	 * @param {Matrix4} matrix - The transformation matrix.
	 * @return {Line3} A reference to this line segment.
	 */
	applyMatrix4( matrix ) {

		this.start.applyMatrix4( matrix );
		this.end.applyMatrix4( matrix );

		return this;

	}

	/**
	 * Returns `true` if this line segment is equal with the given one.
	 *
	 * @param {Line3} line - The line segment to test for equality.
	 * @return {boolean} Whether this line segment is equal with the given one.
	 */
	equals( line ) {

		return line.start.equals( this.start ) && line.end.equals( this.end );

	}

	/**
	 * Returns a new line segment with copied values from this instance.
	 *
	 * @return {Line3} A clone of this instance.
	 */
	clone() {

		return new this.constructor().copy( this );

	}

}

const _vector$3 = /*@__PURE__*/ new Vector3();

/**
 * This displays a cone shaped helper object for a {@link SpotLight}.
 *
 * ```js
 * const spotLight = new THREE.SpotLight( 0xffffff );
 * spotLight.position.set( 10, 10, 10 );
 * scene.add( spotLight );
 *
 * const spotLightHelper = new THREE.SpotLightHelper( spotLight );
 * scene.add( spotLightHelper );
 * ```
 *
 * @augments Object3D
 */
class SpotLightHelper extends Object3D {

	/**
	 * Constructs a new spot light helper.
	 *
	 * @param {HemisphereLight} light - The light to be visualized.
	 * @param {number|Color|string} [color] - The helper's color. If not set, the helper will take
	 * the color of the light.
	 */
	constructor( light, color ) {

		super();

		/**
		 * The light being visualized.
		 *
		 * @type {SpotLight}
		 */
		this.light = light;

		this.matrixAutoUpdate = false;

		/**
		 * The color parameter passed in the constructor.
		 * If not set, the helper will take the color of the light.
		 *
		 * @type {number|Color|string}
		 */
		this.color = color;

		this.type = 'SpotLightHelper';

		const geometry = new BufferGeometry();

		const positions = [
			0, 0, 0, 	0, 0, 1,
			0, 0, 0, 	1, 0, 1,
			0, 0, 0,	-1, 0, 1,
			0, 0, 0, 	0, 1, 1,
			0, 0, 0, 	0, -1, 1
		];

		for ( let i = 0, j = 1, l = 32; i < l; i ++, j ++ ) {

			const p1 = ( i / l ) * Math.PI * 2;
			const p2 = ( j / l ) * Math.PI * 2;

			positions.push(
				Math.cos( p1 ), Math.sin( p1 ), 1,
				Math.cos( p2 ), Math.sin( p2 ), 1
			);

		}

		geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );

		const material = new LineBasicMaterial( { fog: false, toneMapped: false } );

		this.cone = new LineSegments( geometry, material );
		this.add( this.cone );

		this.update();

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.cone.geometry.dispose();
		this.cone.material.dispose();

	}

	/**
	 * Updates the helper to match the position and direction of the
	 * light being visualized.
	 */
	update() {

		this.light.updateWorldMatrix( true, false );
		this.light.target.updateWorldMatrix( true, false );

		// update the local matrix based on the parent and light target transforms
		if ( this.parent ) {

			this.parent.updateWorldMatrix( true );

			this.matrix
				.copy( this.parent.matrixWorld )
				.invert()
				.multiply( this.light.matrixWorld );

		} else {

			this.matrix.copy( this.light.matrixWorld );

		}

		this.matrixWorld.copy( this.light.matrixWorld );

		const coneLength = this.light.distance ? this.light.distance : 1000;
		const coneWidth = coneLength * Math.tan( this.light.angle );

		this.cone.scale.set( coneWidth, coneWidth, coneLength );

		_vector$3.setFromMatrixPosition( this.light.target.matrixWorld );

		this.cone.lookAt( _vector$3 );

		if ( this.color !== undefined ) {

			this.cone.material.color.set( this.color );

		} else {

			this.cone.material.color.copy( this.light.color );

		}

	}

}

const _vector$2 = /*@__PURE__*/ new Vector3();
const _boneMatrix = /*@__PURE__*/ new Matrix4();
const _matrixWorldInv = /*@__PURE__*/ new Matrix4();

/**
 * A helper object to assist with visualizing a {@link Skeleton}.
 *
 * ```js
 * const helper = new THREE.SkeletonHelper( skinnedMesh );
 * scene.add( helper );
 * ```
 *
 * @augments LineSegments
 */
class SkeletonHelper extends LineSegments {

	/**
	 * Constructs a new skeleton helper.
	 *
	 * @param {Object3D} object -  Usually an instance of {@link SkinnedMesh}. However, any 3D object
	 * can be used if it represents a hierarchy of bones (see {@link Bone}).
	 */
	constructor( object ) {

		const bones = getBoneList( object );

		const geometry = new BufferGeometry();

		const vertices = [];
		const colors = [];

		for ( let i = 0; i < bones.length; i ++ ) {

			const bone = bones[ i ];

			if ( bone.parent && bone.parent.isBone ) {

				vertices.push( 0, 0, 0 );
				vertices.push( 0, 0, 0 );
				colors.push( 0, 0, 0 );
				colors.push( 0, 0, 0 );

			}

		}

		geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

		const material = new LineBasicMaterial( { vertexColors: true, depthTest: false, depthWrite: false, toneMapped: false, transparent: true } );

		super( geometry, material );

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isSkeletonHelper = true;

		this.type = 'SkeletonHelper';

		/**
		 * The object being visualized.
		 *
		 * @type {Object3D}
		 */
		this.root = object;

		/**
		 * The list of bones that the helper visualizes.
		 *
		 * @type {Array<Bone>}
		 */
		this.bones = bones;

		this.matrix = object.matrixWorld;
		this.matrixAutoUpdate = false;

		// colors

		const color1 = new Color( 0x0000ff );
		const color2 = new Color( 0x00ff00 );

		this.setColors( color1, color2 );

	}

	updateMatrixWorld( force ) {

		const bones = this.bones;

		const geometry = this.geometry;
		const position = geometry.getAttribute( 'position' );

		_matrixWorldInv.copy( this.root.matrixWorld ).invert();

		for ( let i = 0, j = 0; i < bones.length; i ++ ) {

			const bone = bones[ i ];

			if ( bone.parent && bone.parent.isBone ) {

				_boneMatrix.multiplyMatrices( _matrixWorldInv, bone.matrixWorld );
				_vector$2.setFromMatrixPosition( _boneMatrix );
				position.setXYZ( j, _vector$2.x, _vector$2.y, _vector$2.z );

				_boneMatrix.multiplyMatrices( _matrixWorldInv, bone.parent.matrixWorld );
				_vector$2.setFromMatrixPosition( _boneMatrix );
				position.setXYZ( j + 1, _vector$2.x, _vector$2.y, _vector$2.z );

				j += 2;

			}

		}

		geometry.getAttribute( 'position' ).needsUpdate = true;

		super.updateMatrixWorld( force );

	}

	/**
	 * Defines the colors of the helper.
	 *
	 * @param {Color} color1 - The first line color for each bone.
	 * @param {Color} color2 - The second line color for each bone.
	 * @return {SkeletonHelper} A reference to this helper.
	 */
	setColors( color1, color2 ) {

		const geometry = this.geometry;
		const colorAttribute = geometry.getAttribute( 'color' );

		for ( let i = 0; i < colorAttribute.count; i += 2 ) {

			colorAttribute.setXYZ( i, color1.r, color1.g, color1.b );
			colorAttribute.setXYZ( i + 1, color2.r, color2.g, color2.b );

		}

		colorAttribute.needsUpdate = true;

		return this;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}


function getBoneList( object ) {

	const boneList = [];

	if ( object.isBone === true ) {

		boneList.push( object );

	}

	for ( let i = 0; i < object.children.length; i ++ ) {

		boneList.push( ...getBoneList( object.children[ i ] ) );

	}

	return boneList;

}

/**
 * This displays a helper object consisting of a spherical mesh for
 * visualizing an instance of {@link PointLight}.
 *
 * ```js
 * const pointLight = new THREE.PointLight( 0xff0000, 1, 100 );
 * pointLight.position.set( 10, 10, 10 );
 * scene.add( pointLight );
 *
 * const sphereSize = 1;
 * const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
 * scene.add( pointLightHelper );
 * ```
 *
 * @augments Mesh
 */
class PointLightHelper extends Mesh {

	/**
	 * Constructs a new point light helper.
	 *
	 * @param {PointLight} light - The light to be visualized.
	 * @param {number} [sphereSize=1] - The size of the sphere helper.
	 * @param {number|Color|string} [color] - The helper's color. If not set, the helper will take
	 * the color of the light.
	 */
	constructor( light, sphereSize, color ) {

		const geometry = new SphereGeometry( sphereSize, 4, 2 );
		const material = new MeshBasicMaterial( { wireframe: true, fog: false, toneMapped: false } );

		super( geometry, material );

		/**
		 * The light being visualized.
		 *
		 * @type {HemisphereLight}
		 */
		this.light = light;

		/**
		 * The color parameter passed in the constructor.
		 * If not set, the helper will take the color of the light.
		 *
		 * @type {number|Color|string}
		 */
		this.color = color;

		this.type = 'PointLightHelper';

		this.matrix = this.light.matrixWorld;
		this.matrixAutoUpdate = false;

		this.update();


		/*
	// TODO: delete this comment?
	const distanceGeometry = new THREE.IcosahedronGeometry( 1, 2 );
	const distanceMaterial = new THREE.MeshBasicMaterial( { color: hexColor, fog: false, wireframe: true, opacity: 0.1, transparent: true } );

	this.lightSphere = new THREE.Mesh( bulbGeometry, bulbMaterial );
	this.lightDistance = new THREE.Mesh( distanceGeometry, distanceMaterial );

	const d = light.distance;

	if ( d === 0.0 ) {

		this.lightDistance.visible = false;

	} else {

		this.lightDistance.scale.set( d, d, d );

	}

	this.add( this.lightDistance );
	*/

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

	/**
	 * Updates the helper to match the position of the
	 * light being visualized.
	 */
	update() {

		this.light.updateWorldMatrix( true, false );

		if ( this.color !== undefined ) {

			this.material.color.set( this.color );

		} else {

			this.material.color.copy( this.light.color );

		}

		/*
		const d = this.light.distance;

		if ( d === 0.0 ) {

			this.lightDistance.visible = false;

		} else {

			this.lightDistance.visible = true;
			this.lightDistance.scale.set( d, d, d );

		}
		*/

	}

}

const _vector$1 = /*@__PURE__*/ new Vector3();
const _color1 = /*@__PURE__*/ new Color();
const _color2 = /*@__PURE__*/ new Color();

/**
 * Creates a visual aid consisting of a spherical mesh for a
 * given {@link HemisphereLight}.
 *
 * ```js
 * const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
 * const helper = new THREE.HemisphereLightHelper( light, 5 );
 * scene.add( helper );
 * ```
 *
 * @augments Object3D
 */
class HemisphereLightHelper extends Object3D {

	/**
	 * Constructs a new hemisphere light helper.
	 *
	 * @param {HemisphereLight} light - The light to be visualized.
	 * @param {number} [size=1] - The size of the mesh used to visualize the light.
	 * @param {number|Color|string} [color] - The helper's color. If not set, the helper will take
	 * the color of the light.
	 */
	constructor( light, size, color ) {

		super();

		/**
		 * The light being visualized.
		 *
		 * @type {HemisphereLight}
		 */
		this.light = light;

		this.matrix = light.matrixWorld;
		this.matrixAutoUpdate = false;

		/**
		 * The color parameter passed in the constructor.
		 * If not set, the helper will take the color of the light.
		 *
		 * @type {number|Color|string}
		 */
		this.color = color;

		this.type = 'HemisphereLightHelper';

		const geometry = new OctahedronGeometry( size );
		geometry.rotateY( Math.PI * 0.5 );

		this.material = new MeshBasicMaterial( { wireframe: true, fog: false, toneMapped: false } );
		if ( this.color === undefined ) this.material.vertexColors = true;

		const position = geometry.getAttribute( 'position' );
		const colors = new Float32Array( position.count * 3 );

		geometry.setAttribute( 'color', new BufferAttribute( colors, 3 ) );

		this.add( new Mesh( geometry, this.material ) );

		this.update();

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.children[ 0 ].geometry.dispose();
		this.children[ 0 ].material.dispose();

	}

	/**
	 * Updates the helper to match the position and direction of the
	 * light being visualized.
	 */
	update() {

		const mesh = this.children[ 0 ];

		if ( this.color !== undefined ) {

			this.material.color.set( this.color );

		} else {

			const colors = mesh.geometry.getAttribute( 'color' );

			_color1.copy( this.light.color );
			_color2.copy( this.light.groundColor );

			for ( let i = 0, l = colors.count; i < l; i ++ ) {

				const color = ( i < ( l / 2 ) ) ? _color1 : _color2;

				colors.setXYZ( i, color.r, color.g, color.b );

			}

			colors.needsUpdate = true;

		}

		this.light.updateWorldMatrix( true, false );

		mesh.lookAt( _vector$1.setFromMatrixPosition( this.light.matrixWorld ).negate() );

	}

}

/**
 * The helper is an object to define grids. Grids are two-dimensional
 * arrays of lines.
 *
 * ```js
 * const size = 10;
 * const divisions = 10;
 *
 * const gridHelper = new THREE.GridHelper( size, divisions );
 * scene.add( gridHelper );
 * ```
 *
 * @augments LineSegments
 */
class GridHelper extends LineSegments {

	/**
	 * Constructs a new grid helper.
	 *
	 * @param {number} [size=10] - The size of the grid.
	 * @param {number} [divisions=10] - The number of divisions across the grid.
	 * @param {number|Color|string} [color1=0x444444] - The color of the center line.
	 * @param {number|Color|string} [color2=0x888888] - The color of the lines of the grid.
	 */
	constructor( size = 10, divisions = 10, color1 = 0x444444, color2 = 0x888888 ) {

		color1 = new Color( color1 );
		color2 = new Color( color2 );

		const center = divisions / 2;
		const step = size / divisions;
		const halfSize = size / 2;

		const vertices = [], colors = [];

		for ( let i = 0, j = 0, k = - halfSize; i <= divisions; i ++, k += step ) {

			vertices.push( - halfSize, 0, k, halfSize, 0, k );
			vertices.push( k, 0, - halfSize, k, 0, halfSize );

			const color = i === center ? color1 : color2;

			color.toArray( colors, j ); j += 3;
			color.toArray( colors, j ); j += 3;
			color.toArray( colors, j ); j += 3;
			color.toArray( colors, j ); j += 3;

		}

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

		const material = new LineBasicMaterial( { vertexColors: true, toneMapped: false } );

		super( geometry, material );

		this.type = 'GridHelper';

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

/**
 * This helper is an object to define polar grids. Grids are
 * two-dimensional arrays of lines.
 *
 * ```js
 * const radius = 10;
 * const sectors = 16;
 * const rings = 8;
 * const divisions = 64;
 *
 * const helper = new THREE.PolarGridHelper( radius, sectors, rings, divisions );
 * scene.add( helper );
 * ```
 *
 * @augments LineSegments
 */
class PolarGridHelper extends LineSegments {

	/**
	 * Constructs a new polar grid helper.
	 *
	 * @param {number} [radius=10] - The radius of the polar grid. This can be any positive number.
	 * @param {number} [sectors=16] - The number of sectors the grid will be divided into. This can be any positive integer.
	 * @param {number} [rings=16] - The number of rings. This can be any positive integer.
	 * @param {number} [divisions=64] - The number of line segments used for each circle. This can be any positive integer.
	 * @param {number|Color|string} [color1=0x444444] - The first color used for grid elements.
	 * @param {number|Color|string} [color2=0x888888] -  The second color used for grid elements.
	 */
	constructor( radius = 10, sectors = 16, rings = 8, divisions = 64, color1 = 0x444444, color2 = 0x888888 ) {

		color1 = new Color( color1 );
		color2 = new Color( color2 );

		const vertices = [];
		const colors = [];

		// create the sectors

		if ( sectors > 1 ) {

			for ( let i = 0; i < sectors; i ++ ) {

				const v = ( i / sectors ) * ( Math.PI * 2 );

				const x = Math.sin( v ) * radius;
				const z = Math.cos( v ) * radius;

				vertices.push( 0, 0, 0 );
				vertices.push( x, 0, z );

				const color = ( i & 1 ) ? color1 : color2;

				colors.push( color.r, color.g, color.b );
				colors.push( color.r, color.g, color.b );

			}

		}

		// create the rings

		for ( let i = 0; i < rings; i ++ ) {

			const color = ( i & 1 ) ? color1 : color2;

			const r = radius - ( radius / rings * i );

			for ( let j = 0; j < divisions; j ++ ) {

				// first vertex

				let v = ( j / divisions ) * ( Math.PI * 2 );

				let x = Math.sin( v ) * r;
				let z = Math.cos( v ) * r;

				vertices.push( x, 0, z );
				colors.push( color.r, color.g, color.b );

				// second vertex

				v = ( ( j + 1 ) / divisions ) * ( Math.PI * 2 );

				x = Math.sin( v ) * r;
				z = Math.cos( v ) * r;

				vertices.push( x, 0, z );
				colors.push( color.r, color.g, color.b );

			}

		}

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

		const material = new LineBasicMaterial( { vertexColors: true, toneMapped: false } );

		super( geometry, material );

		this.type = 'PolarGridHelper';

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

const _v1 = /*@__PURE__*/ new Vector3();
const _v2 = /*@__PURE__*/ new Vector3();
const _v3 = /*@__PURE__*/ new Vector3();

/**
 * Helper object to assist with visualizing a {@link DirectionalLight}'s
 * effect on the scene. This consists of plane and a line representing the
 * light's position and direction.
 *
 * ```js
 * const light = new THREE.DirectionalLight( 0xFFFFFF );
 * scene.add( light );
 *
 * const helper = new THREE.DirectionalLightHelper( light, 5 );
 * scene.add( helper );
 * ```
 *
 * @augments Object3D
 */
class DirectionalLightHelper extends Object3D {

	/**
	 * Constructs a new directional light helper.
	 *
	 * @param {DirectionalLight} light - The light to be visualized.
	 * @param {number} [size=1] - The dimensions of the plane.
	 * @param {number|Color|string} [color] - The helper's color. If not set, the helper will take
	 * the color of the light.
	 */
	constructor( light, size, color ) {

		super();

		/**
		 * The light being visualized.
		 *
		 * @type {DirectionalLight}
		 */
		this.light = light;

		this.matrix = light.matrixWorld;
		this.matrixAutoUpdate = false;

		/**
		 * The color parameter passed in the constructor.
		 * If not set, the helper will take the color of the light.
		 *
		 * @type {number|Color|string}
		 */
		this.color = color;

		this.type = 'DirectionalLightHelper';

		if ( size === undefined ) size = 1;

		let geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( [
			- size, size, 0,
			size, size, 0,
			size, - size, 0,
			- size, - size, 0,
			- size, size, 0
		], 3 ) );

		const material = new LineBasicMaterial( { fog: false, toneMapped: false } );

		/**
		 * Contains the line showing the location of the directional light.
		 *
		 * @type {Line}
		 */
		this.lightPlane = new Line( geometry, material );
		this.add( this.lightPlane );

		geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( [ 0, 0, 0, 0, 0, 1 ], 3 ) );

		/**
		 * Represents the target line of the directional light.
		 *
		 * @type {Line}
		 */
		this.targetLine = new Line( geometry, material );
		this.add( this.targetLine );

		this.update();

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.lightPlane.geometry.dispose();
		this.lightPlane.material.dispose();
		this.targetLine.geometry.dispose();
		this.targetLine.material.dispose();

	}

	/**
	 * Updates the helper to match the position and direction of the
	 * light being visualized.
	 */
	update() {

		this.light.updateWorldMatrix( true, false );
		this.light.target.updateWorldMatrix( true, false );

		_v1.setFromMatrixPosition( this.light.matrixWorld );
		_v2.setFromMatrixPosition( this.light.target.matrixWorld );
		_v3.subVectors( _v2, _v1 );

		this.lightPlane.lookAt( _v2 );

		if ( this.color !== undefined ) {

			this.lightPlane.material.color.set( this.color );
			this.targetLine.material.color.set( this.color );

		} else {

			this.lightPlane.material.color.copy( this.light.color );
			this.targetLine.material.color.copy( this.light.color );

		}

		this.targetLine.lookAt( _v2 );
		this.targetLine.scale.z = _v3.length();

	}

}

const _vector = /*@__PURE__*/ new Vector3();
const _camera = /*@__PURE__*/ new Camera();

/**
 * This helps with visualizing what a camera contains in its frustum. It
 * visualizes the frustum of a camera using a line segments.
 *
 * Based on frustum visualization in [lightgl.js shadowmap example]{@link https://github.com/evanw/lightgl.js/blob/master/tests/shadowmap.html}.
 *
 * `CameraHelper` must be a child of the scene.
 *
 * ```js
 * const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
 * const helper = new THREE.CameraHelper( camera );
 * scene.add( helper );
 * ```
 *
 * @augments LineSegments
 */
class CameraHelper extends LineSegments {

	/**
	 * Constructs a new arrow helper.
	 *
	 * @param {Camera} camera - The camera to visualize.
	 */
	constructor( camera ) {

		const geometry = new BufferGeometry();
		const material = new LineBasicMaterial( { color: 0xffffff, vertexColors: true, toneMapped: false } );

		const vertices = [];
		const colors = [];

		const pointMap = {};

		// near

		addLine( 'n1', 'n2' );
		addLine( 'n2', 'n4' );
		addLine( 'n4', 'n3' );
		addLine( 'n3', 'n1' );

		// far

		addLine( 'f1', 'f2' );
		addLine( 'f2', 'f4' );
		addLine( 'f4', 'f3' );
		addLine( 'f3', 'f1' );

		// sides

		addLine( 'n1', 'f1' );
		addLine( 'n2', 'f2' );
		addLine( 'n3', 'f3' );
		addLine( 'n4', 'f4' );

		// cone

		addLine( 'p', 'n1' );
		addLine( 'p', 'n2' );
		addLine( 'p', 'n3' );
		addLine( 'p', 'n4' );

		// up

		addLine( 'u1', 'u2' );
		addLine( 'u2', 'u3' );
		addLine( 'u3', 'u1' );

		// target

		addLine( 'c', 't' );
		addLine( 'p', 'c' );

		// cross

		addLine( 'cn1', 'cn2' );
		addLine( 'cn3', 'cn4' );

		addLine( 'cf1', 'cf2' );
		addLine( 'cf3', 'cf4' );

		function addLine( a, b ) {

			addPoint( a );
			addPoint( b );

		}

		function addPoint( id ) {

			vertices.push( 0, 0, 0 );
			colors.push( 0, 0, 0 );

			if ( pointMap[ id ] === undefined ) {

				pointMap[ id ] = [];

			}

			pointMap[ id ].push( ( vertices.length / 3 ) - 1 );

		}

		geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

		super( geometry, material );

		this.type = 'CameraHelper';

		/**
		 * The camera being visualized.
		 *
		 * @type {Camera}
		 */
		this.camera = camera;
		if ( this.camera.updateProjectionMatrix ) this.camera.updateProjectionMatrix();

		this.matrix = camera.matrixWorld;
		this.matrixAutoUpdate = false;

		/**
		 * This contains the points used to visualize the camera.
		 *
		 * @type {Object<string,Array<number>>}
		 */
		this.pointMap = pointMap;

		this.update();

		// colors

		const colorFrustum = new Color( 0xffaa00 );
		const colorCone = new Color( 0xff0000 );
		const colorUp = new Color( 0x00aaff );
		const colorTarget = new Color( 0xffffff );
		const colorCross = new Color( 0x333333 );

		this.setColors( colorFrustum, colorCone, colorUp, colorTarget, colorCross );

	}

	/**
	 * Defines the colors of the helper.
	 *
	 * @param {Color} frustum - The frustum line color.
	 * @param {Color} cone - The cone line color.
	 * @param {Color} up - The up line color.
	 * @param {Color} target - The target line color.
	 * @param {Color} cross - The cross line color.
	 * @return {CameraHelper} A reference to this helper.
	 */
	setColors( frustum, cone, up, target, cross ) {

		const geometry = this.geometry;

		const colorAttribute = geometry.getAttribute( 'color' );

		// near

		colorAttribute.setXYZ( 0, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 1, frustum.r, frustum.g, frustum.b ); // n1, n2
		colorAttribute.setXYZ( 2, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 3, frustum.r, frustum.g, frustum.b ); // n2, n4
		colorAttribute.setXYZ( 4, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 5, frustum.r, frustum.g, frustum.b ); // n4, n3
		colorAttribute.setXYZ( 6, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 7, frustum.r, frustum.g, frustum.b ); // n3, n1

		// far

		colorAttribute.setXYZ( 8, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 9, frustum.r, frustum.g, frustum.b ); // f1, f2
		colorAttribute.setXYZ( 10, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 11, frustum.r, frustum.g, frustum.b ); // f2, f4
		colorAttribute.setXYZ( 12, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 13, frustum.r, frustum.g, frustum.b ); // f4, f3
		colorAttribute.setXYZ( 14, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 15, frustum.r, frustum.g, frustum.b ); // f3, f1

		// sides

		colorAttribute.setXYZ( 16, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 17, frustum.r, frustum.g, frustum.b ); // n1, f1
		colorAttribute.setXYZ( 18, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 19, frustum.r, frustum.g, frustum.b ); // n2, f2
		colorAttribute.setXYZ( 20, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 21, frustum.r, frustum.g, frustum.b ); // n3, f3
		colorAttribute.setXYZ( 22, frustum.r, frustum.g, frustum.b ); colorAttribute.setXYZ( 23, frustum.r, frustum.g, frustum.b ); // n4, f4

		// cone

		colorAttribute.setXYZ( 24, cone.r, cone.g, cone.b ); colorAttribute.setXYZ( 25, cone.r, cone.g, cone.b ); // p, n1
		colorAttribute.setXYZ( 26, cone.r, cone.g, cone.b ); colorAttribute.setXYZ( 27, cone.r, cone.g, cone.b ); // p, n2
		colorAttribute.setXYZ( 28, cone.r, cone.g, cone.b ); colorAttribute.setXYZ( 29, cone.r, cone.g, cone.b ); // p, n3
		colorAttribute.setXYZ( 30, cone.r, cone.g, cone.b ); colorAttribute.setXYZ( 31, cone.r, cone.g, cone.b ); // p, n4

		// up

		colorAttribute.setXYZ( 32, up.r, up.g, up.b ); colorAttribute.setXYZ( 33, up.r, up.g, up.b ); // u1, u2
		colorAttribute.setXYZ( 34, up.r, up.g, up.b ); colorAttribute.setXYZ( 35, up.r, up.g, up.b ); // u2, u3
		colorAttribute.setXYZ( 36, up.r, up.g, up.b ); colorAttribute.setXYZ( 37, up.r, up.g, up.b ); // u3, u1

		// target

		colorAttribute.setXYZ( 38, target.r, target.g, target.b ); colorAttribute.setXYZ( 39, target.r, target.g, target.b ); // c, t
		colorAttribute.setXYZ( 40, cross.r, cross.g, cross.b ); colorAttribute.setXYZ( 41, cross.r, cross.g, cross.b ); // p, c

		// cross

		colorAttribute.setXYZ( 42, cross.r, cross.g, cross.b ); colorAttribute.setXYZ( 43, cross.r, cross.g, cross.b ); // cn1, cn2
		colorAttribute.setXYZ( 44, cross.r, cross.g, cross.b ); colorAttribute.setXYZ( 45, cross.r, cross.g, cross.b ); // cn3, cn4

		colorAttribute.setXYZ( 46, cross.r, cross.g, cross.b ); colorAttribute.setXYZ( 47, cross.r, cross.g, cross.b ); // cf1, cf2
		colorAttribute.setXYZ( 48, cross.r, cross.g, cross.b ); colorAttribute.setXYZ( 49, cross.r, cross.g, cross.b ); // cf3, cf4

		colorAttribute.needsUpdate = true;

		return this;

	}

	/**
	 * Updates the helper based on the projection matrix of the camera.
	 */
	update() {

		const geometry = this.geometry;
		const pointMap = this.pointMap;

		const w = 1, h = 1;

		let nearZ, farZ;

		// we need just camera projection matrix inverse
		// world matrix must be identity

		_camera.projectionMatrixInverse.copy( this.camera.projectionMatrixInverse );

		// Adjust z values based on coordinate system

		if ( this.camera.reversedDepth === true ) {

			nearZ = 1;
			farZ = 0;

		} else {

			if ( this.camera.coordinateSystem === WebGLCoordinateSystem ) {

				nearZ = -1;
				farZ = 1;

			} else if ( this.camera.coordinateSystem === WebGPUCoordinateSystem ) {

				nearZ = 0;
				farZ = 1;

			} else {

				throw new Error( 'THREE.CameraHelper.update(): Invalid coordinate system: ' + this.camera.coordinateSystem );

			}

		}


		// center / target
		setPoint( 'c', pointMap, geometry, _camera, 0, 0, nearZ );
		setPoint( 't', pointMap, geometry, _camera, 0, 0, farZ );

		// near

		setPoint( 'n1', pointMap, geometry, _camera, - w, - h, nearZ );
		setPoint( 'n2', pointMap, geometry, _camera, w, - h, nearZ );
		setPoint( 'n3', pointMap, geometry, _camera, - w, h, nearZ );
		setPoint( 'n4', pointMap, geometry, _camera, w, h, nearZ );

		// far

		setPoint( 'f1', pointMap, geometry, _camera, - w, - h, farZ );
		setPoint( 'f2', pointMap, geometry, _camera, w, - h, farZ );
		setPoint( 'f3', pointMap, geometry, _camera, - w, h, farZ );
		setPoint( 'f4', pointMap, geometry, _camera, w, h, farZ );

		// up

		setPoint( 'u1', pointMap, geometry, _camera, w * 0.7, h * 1.1, nearZ );
		setPoint( 'u2', pointMap, geometry, _camera, - w * 0.7, h * 1.1, nearZ );
		setPoint( 'u3', pointMap, geometry, _camera, 0, h * 2, nearZ );

		// cross

		setPoint( 'cf1', pointMap, geometry, _camera, - w, 0, farZ );
		setPoint( 'cf2', pointMap, geometry, _camera, w, 0, farZ );
		setPoint( 'cf3', pointMap, geometry, _camera, 0, - h, farZ );
		setPoint( 'cf4', pointMap, geometry, _camera, 0, h, farZ );

		setPoint( 'cn1', pointMap, geometry, _camera, - w, 0, nearZ );
		setPoint( 'cn2', pointMap, geometry, _camera, w, 0, nearZ );
		setPoint( 'cn3', pointMap, geometry, _camera, 0, - h, nearZ );
		setPoint( 'cn4', pointMap, geometry, _camera, 0, h, nearZ );

		geometry.getAttribute( 'position' ).needsUpdate = true;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}


function setPoint( point, pointMap, geometry, camera, x, y, z ) {

	_vector.set( x, y, z ).unproject( camera );

	const points = pointMap[ point ];

	if ( points !== undefined ) {

		const position = geometry.getAttribute( 'position' );

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			position.setXYZ( points[ i ], _vector.x, _vector.y, _vector.z );

		}

	}

}

const _box = /*@__PURE__*/ new Box3();

/**
 * Helper object to graphically show the world-axis-aligned bounding box
 * around an object. The actual bounding box is handled with {@link Box3},
 * this is just a visual helper for debugging. It can be automatically
 * resized with {@link BoxHelper#update} when the object it's created from
 * is transformed. Note that the object must have a geometry for this to work,
 * so it won't work with sprites.
 *
 * ```js
 * const sphere = new THREE.SphereGeometry();
 * const object = new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( 0xff0000 ) );
 * const box = new THREE.BoxHelper( object, 0xffff00 );
 * scene.add( box );
 * ```
 *
 * @augments LineSegments
 */
class BoxHelper extends LineSegments {

	/**
	 * Constructs a new box helper.
	 *
	 * @param {Object3D} [object] - The 3D object to show the world-axis-aligned bounding box.
	 * @param {number|Color|string} [color=0xffff00] - The box's color.
	 */
	constructor( object, color = 0xffff00 ) {

		const indices = new Uint16Array( [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ] );
		const positions = new Float32Array( 8 * 3 );

		const geometry = new BufferGeometry();
		geometry.setIndex( new BufferAttribute( indices, 1 ) );
		geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );

		super( geometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );

		/**
		 * The 3D object being visualized.
		 *
		 * @type {Object3D}
		 */
		this.object = object;
		this.type = 'BoxHelper';

		this.matrixAutoUpdate = false;

		this.update();

	}

	/**
	 * Updates the helper's geometry to match the dimensions of the object,
	 * including any children.
	 */
	update() {

		if ( this.object !== undefined ) {

			_box.setFromObject( this.object );

		}

		if ( _box.isEmpty() ) return;

		const min = _box.min;
		const max = _box.max;

		/*
			5____4
		1/___0/|
		| 6__|_7
		2/___3/

		0: max.x, max.y, max.z
		1: min.x, max.y, max.z
		2: min.x, min.y, max.z
		3: max.x, min.y, max.z
		4: max.x, max.y, min.z
		5: min.x, max.y, min.z
		6: min.x, min.y, min.z
		7: max.x, min.y, min.z
		*/

		const position = this.geometry.attributes.position;
		const array = position.array;

		array[ 0 ] = max.x; array[ 1 ] = max.y; array[ 2 ] = max.z;
		array[ 3 ] = min.x; array[ 4 ] = max.y; array[ 5 ] = max.z;
		array[ 6 ] = min.x; array[ 7 ] = min.y; array[ 8 ] = max.z;
		array[ 9 ] = max.x; array[ 10 ] = min.y; array[ 11 ] = max.z;
		array[ 12 ] = max.x; array[ 13 ] = max.y; array[ 14 ] = min.z;
		array[ 15 ] = min.x; array[ 16 ] = max.y; array[ 17 ] = min.z;
		array[ 18 ] = min.x; array[ 19 ] = min.y; array[ 20 ] = min.z;
		array[ 21 ] = max.x; array[ 22 ] = min.y; array[ 23 ] = min.z;

		position.needsUpdate = true;

		this.geometry.computeBoundingSphere();

	}

	/**
	 * Updates the wireframe box for the passed object.
	 *
	 * @param {Object3D} object - The 3D object to create the helper for.
	 * @return {BoxHelper} A reference to this instance.
	 */
	setFromObject( object ) {

		this.object = object;
		this.update();

		return this;

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.object = source.object;

		return this;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

/**
 * A helper object to visualize an instance of {@link Box3}.
 *
 * ```js
 * const box = new THREE.Box3();
 * box.setFromCenterAndSize( new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 2, 1, 3 ) );
 *
 * const helper = new THREE.Box3Helper( box, 0xffff00 );
 * scene.add( helper )
 * ```
 *
 * @augments LineSegments
 */
class Box3Helper extends LineSegments {

	/**
	 * Constructs a new box3 helper.
	 *
	 * @param {Box3} box - The box to visualize.
	 * @param {number|Color|string} [color=0xffff00] - The box's color.
	 */
	constructor( box, color = 0xffff00 ) {

		const indices = new Uint16Array( [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ] );

		const positions = [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1 ];

		const geometry = new BufferGeometry();

		geometry.setIndex( new BufferAttribute( indices, 1 ) );

		geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );

		super( geometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );

		/**
		 * The box being visualized.
		 *
		 * @type {Box3}
		 */
		this.box = box;

		this.type = 'Box3Helper';

		this.geometry.computeBoundingSphere();

	}

	updateMatrixWorld( force ) {

		const box = this.box;

		if ( box.isEmpty() ) return;

		box.getCenter( this.position );

		box.getSize( this.scale );

		this.scale.multiplyScalar( 0.5 );

		super.updateMatrixWorld( force );

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

/**
 * A helper object to visualize an instance of {@link Plane}.
 *
 * ```js
 * const plane = new THREE.Plane( new THREE.Vector3( 1, 1, 0.2 ), 3 );
 * const helper = new THREE.PlaneHelper( plane, 1, 0xffff00 );
 * scene.add( helper );
 * ```
 *
 * @augments Line
 */
class PlaneHelper extends Line {

	/**
	 * Constructs a new plane helper.
	 *
	 * @param {Plane} plane - The plane to be visualized.
	 * @param {number} [size=1] - The side length of plane helper.
	 * @param {number|Color|string} [hex=0xffff00] - The helper's color.
	 */
	constructor( plane, size = 1, hex = 0xffff00 ) {

		const color = hex;

		const positions = [ 1, -1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0 ];

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );
		geometry.computeBoundingSphere();

		super( geometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );

		this.type = 'PlaneHelper';

		/**
		 * The plane being visualized.
		 *
		 * @type {Plane}
		 */
		this.plane = plane;

		/**
		 * The side length of plane helper.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.size = size;

		const positions2 = [ 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0 ];

		const geometry2 = new BufferGeometry();
		geometry2.setAttribute( 'position', new Float32BufferAttribute( positions2, 3 ) );
		geometry2.computeBoundingSphere();

		this.add( new Mesh( geometry2, new MeshBasicMaterial( { color: color, opacity: 0.2, transparent: true, depthWrite: false, toneMapped: false } ) ) );

	}

	updateMatrixWorld( force ) {

		this.position.set( 0, 0, 0 );

		this.scale.set( 0.5 * this.size, 0.5 * this.size, 1 );

		this.lookAt( this.plane.normal );

		this.translateZ( - this.plane.constant );

		super.updateMatrixWorld( force );

	}

	/**
	 * Updates the helper to match the position and direction of the
	 * light being visualized.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();
		this.children[ 0 ].geometry.dispose();
		this.children[ 0 ].material.dispose();

	}

}

const _axis = /*@__PURE__*/ new Vector3();
let _lineGeometry, _coneGeometry;

/**
 * An 3D arrow object for visualizing directions.
 *
 * ```js
 * const dir = new THREE.Vector3( 1, 2, 0 );
 *
 * //normalize the direction vector (convert to vector of length 1)
 * dir.normalize();
 *
 * const origin = new THREE.Vector3( 0, 0, 0 );
 * const length = 1;
 * const hex = 0xffff00;
 *
 * const arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
 * scene.add( arrowHelper );
 * ```
 *
 * @augments Object3D
 */
class ArrowHelper extends Object3D {

	/**
	 * Constructs a new arrow helper.
	 *
	 * @param {Vector3} [dir=(0, 0, 1)] - The (normalized) direction vector.
	 * @param {Vector3} [origin=(0, 0, 0)] - Point at which the arrow starts.
	 * @param {number} [length=1] - Length of the arrow in world units.
	 * @param {(number|Color|string)} [color=0xffff00] - Color of the arrow.
	 * @param {number} [headLength=length*0.2] - The length of the head of the arrow.
	 * @param {number} [headWidth=headLength*0.2] - The width of the head of the arrow.
	 */
	constructor( dir = new Vector3( 0, 0, 1 ), origin = new Vector3( 0, 0, 0 ), length = 1, color = 0xffff00, headLength = length * 0.2, headWidth = headLength * 0.2 ) {

		super();

		this.type = 'ArrowHelper';

		if ( _lineGeometry === undefined ) {

			_lineGeometry = new BufferGeometry();
			_lineGeometry.setAttribute( 'position', new Float32BufferAttribute( [ 0, 0, 0, 0, 1, 0 ], 3 ) );

			_coneGeometry = new ConeGeometry( 0.5, 1, 5, 1 );
			_coneGeometry.translate( 0, -0.5, 0 );

		}

		this.position.copy( origin );

		/**
		 * The line part of the arrow helper.
		 *
		 * @type {Line}
		 */
		this.line = new Line( _lineGeometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );
		this.line.matrixAutoUpdate = false;
		this.add( this.line );

		/**
		 * The cone part of the arrow helper.
		 *
		 * @type {Mesh}
		 */
		this.cone = new Mesh( _coneGeometry, new MeshBasicMaterial( { color: color, toneMapped: false } ) );
		this.cone.matrixAutoUpdate = false;
		this.add( this.cone );

		this.setDirection( dir );
		this.setLength( length, headLength, headWidth );

	}

	/**
	 * Sets the direction of the helper.
	 *
	 * @param {Vector3} dir - The normalized direction vector.
	 */
	setDirection( dir ) {

		// dir is assumed to be normalized

		if ( dir.y > 0.99999 ) {

			this.quaternion.set( 0, 0, 0, 1 );

		} else if ( dir.y < -0.99999 ) {

			this.quaternion.set( 1, 0, 0, 0 );

		} else {

			_axis.set( dir.z, 0, - dir.x ).normalize();

			const radians = Math.acos( dir.y );

			this.quaternion.setFromAxisAngle( _axis, radians );

		}

	}

	/**
	 * Sets the length of the helper.
	 *
	 * @param {number} length - Length of the arrow in world units.
	 * @param {number} [headLength=length*0.2] - The length of the head of the arrow.
	 * @param {number} [headWidth=headLength*0.2] - The width of the head of the arrow.
	 */
	setLength( length, headLength = length * 0.2, headWidth = headLength * 0.2 ) {

		this.line.scale.set( 1, Math.max( 0.0001, length - headLength ), 1 ); // see #17458
		this.line.updateMatrix();

		this.cone.scale.set( headWidth, headLength, headWidth );
		this.cone.position.y = length;
		this.cone.updateMatrix();

	}

	/**
	 * Sets the color of the helper.
	 *
	 * @param {number|Color|string} color - The color to set.
	 */
	setColor( color ) {

		this.line.material.color.set( color );
		this.cone.material.color.set( color );

	}

	copy( source ) {

		super.copy( source, false );

		this.line.copy( source.line );
		this.cone.copy( source.cone );

		return this;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.line.geometry.dispose();
		this.line.material.dispose();
		this.cone.geometry.dispose();
		this.cone.material.dispose();

	}

}

/**
 * An axis object to visualize the 3 axes in a simple way.
 * The X axis is red. The Y axis is green. The Z axis is blue.
 *
 * ```js
 * const axesHelper = new THREE.AxesHelper( 5 );
 * scene.add( axesHelper );
 * ```
 *
 * @augments LineSegments
 */
class AxesHelper extends LineSegments {

	/**
	 * Constructs a new axes helper.
	 *
	 * @param {number} [size=1] - Size of the lines representing the axes.
	 */
	constructor( size = 1 ) {

		const vertices = [
			0, 0, 0,	size, 0, 0,
			0, 0, 0,	0, size, 0,
			0, 0, 0,	0, 0, size
		];

		const colors = [
			1, 0, 0,	1, 0.6, 0,
			0, 1, 0,	0.6, 1, 0,
			0, 0, 1,	0, 0.6, 1
		];

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

		const material = new LineBasicMaterial( { vertexColors: true, toneMapped: false } );

		super( geometry, material );

		this.type = 'AxesHelper';

	}

	/**
	 * Defines the colors of the axes helper.
	 *
	 * @param {number|Color|string} xAxisColor - The color for the x axis.
	 * @param {number|Color|string} yAxisColor - The color for the y axis.
	 * @param {number|Color|string} zAxisColor - The color for the z axis.
	 * @return {AxesHelper} A reference to this axes helper.
	 */
	setColors( xAxisColor, yAxisColor, zAxisColor ) {

		const color = new Color();
		const array = this.geometry.attributes.color.array;

		color.set( xAxisColor );
		color.toArray( array, 0 );
		color.toArray( array, 3 );

		color.set( yAxisColor );
		color.toArray( array, 6 );
		color.toArray( array, 9 );

		color.set( zAxisColor );
		color.toArray( array, 12 );
		color.toArray( array, 15 );

		this.geometry.attributes.color.needsUpdate = true;

		return this;

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever this instance is no longer used in your app.
	 */
	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}

/**
 * This class is used to convert a series of paths to an array of
 * shapes. It is specifically used in context of fonts and SVG.
 */
class ShapePath {

	/**
	 * Constructs a new shape path.
	 */
	constructor() {

		this.type = 'ShapePath';

		/**
		 * The color of the shape.
		 *
		 * @type {Color}
		 */
		this.color = new Color();

		/**
		 * The paths that have been generated for this shape.
		 *
		 * @type {Array<Path>}
		 * @default null
		 */
		this.subPaths = [];

		/**
		 * The current path that is being generated.
		 *
		 * @type {?Path}
		 * @default null
		 */
		this.currentPath = null;

	}

	/**
	 * Creates a new path and moves it current point to the given one.
	 *
	 * @param {number} x - The x coordinate.
	 * @param {number} y - The y coordinate.
	 * @return {ShapePath} A reference to this shape path.
	 */
	moveTo( x, y ) {

		this.currentPath = new Path();
		this.subPaths.push( this.currentPath );
		this.currentPath.moveTo( x, y );

		return this;

	}

	/**
	 * Adds an instance of {@link LineCurve} to the path by connecting
	 * the current point with the given one.
	 *
	 * @param {number} x - The x coordinate of the end point.
	 * @param {number} y - The y coordinate of the end point.
	 * @return {ShapePath} A reference to this shape path.
	 */
	lineTo( x, y ) {

		this.currentPath.lineTo( x, y );

		return this;

	}

	/**
	 * Adds an instance of {@link QuadraticBezierCurve} to the path by connecting
	 * the current point with the given one.
	 *
	 * @param {number} aCPx - The x coordinate of the control point.
	 * @param {number} aCPy - The y coordinate of the control point.
	 * @param {number} aX - The x coordinate of the end point.
	 * @param {number} aY - The y coordinate of the end point.
	 * @return {ShapePath} A reference to this shape path.
	 */
	quadraticCurveTo( aCPx, aCPy, aX, aY ) {

		this.currentPath.quadraticCurveTo( aCPx, aCPy, aX, aY );

		return this;

	}

	/**
	 * Adds an instance of {@link CubicBezierCurve} to the path by connecting
	 * the current point with the given one.
	 *
	 * @param {number} aCP1x - The x coordinate of the first control point.
	 * @param {number} aCP1y - The y coordinate of the first control point.
	 * @param {number} aCP2x - The x coordinate of the second control point.
	 * @param {number} aCP2y - The y coordinate of the second control point.
	 * @param {number} aX - The x coordinate of the end point.
	 * @param {number} aY - The y coordinate of the end point.
	 * @return {ShapePath} A reference to this shape path.
	 */
	bezierCurveTo( aCP1x, aCP1y, aCP2x, aCP2y, aX, aY ) {

		this.currentPath.bezierCurveTo( aCP1x, aCP1y, aCP2x, aCP2y, aX, aY );

		return this;

	}

	/**
	 * Adds an instance of {@link SplineCurve} to the path by connecting
	 * the current point with the given list of points.
	 *
	 * @param {Array<Vector2>} pts - An array of points in 2D space.
	 * @return {ShapePath} A reference to this shape path.
	 */
	splineThru( pts ) {

		this.currentPath.splineThru( pts );

		return this;

	}

	/**
	 * Converts the paths into an array of shapes.
	 *
	 * @param {boolean} isCCW - By default solid shapes are  defined clockwise (CW) and holes are defined counterclockwise (CCW).
	 * If this flag is set to `true`, then those are flipped.
	 * @return {Array<Shape>} An array of shapes.
	 */
	toShapes( isCCW ) {

		function toShapesNoHoles( inSubpaths ) {

			const shapes = [];

			for ( let i = 0, l = inSubpaths.length; i < l; i ++ ) {

				const tmpPath = inSubpaths[ i ];

				const tmpShape = new Shape();
				tmpShape.curves = tmpPath.curves;

				shapes.push( tmpShape );

			}

			return shapes;

		}

		function isPointInsidePolygon( inPt, inPolygon ) {

			const polyLen = inPolygon.length;

			// inPt on polygon contour => immediate success    or
			// toggling of inside/outside at every single! intersection point of an edge
			//  with the horizontal line through inPt, left of inPt
			//  not counting lowerY endpoints of edges and whole edges on that line
			let inside = false;
			for ( let p = polyLen - 1, q = 0; q < polyLen; p = q ++ ) {

				let edgeLowPt = inPolygon[ p ];
				let edgeHighPt = inPolygon[ q ];

				let edgeDx = edgeHighPt.x - edgeLowPt.x;
				let edgeDy = edgeHighPt.y - edgeLowPt.y;

				if ( Math.abs( edgeDy ) > Number.EPSILON ) {

					// not parallel
					if ( edgeDy < 0 ) {

						edgeLowPt = inPolygon[ q ]; edgeDx = - edgeDx;
						edgeHighPt = inPolygon[ p ]; edgeDy = - edgeDy;

					}

					if ( ( inPt.y < edgeLowPt.y ) || ( inPt.y > edgeHighPt.y ) ) 		continue;

					if ( inPt.y === edgeLowPt.y ) {

						if ( inPt.x === edgeLowPt.x )		return	true;		// inPt is on contour ?
						// continue;				// no intersection or edgeLowPt => doesn't count !!!

					} else {

						const perpEdge = edgeDy * ( inPt.x - edgeLowPt.x ) - edgeDx * ( inPt.y - edgeLowPt.y );
						if ( perpEdge === 0 )				return	true;		// inPt is on contour ?
						if ( perpEdge < 0 ) 				continue;
						inside = ! inside;		// true intersection left of inPt

					}

				} else {

					// parallel or collinear
					if ( inPt.y !== edgeLowPt.y ) 		continue;			// parallel
					// edge lies on the same horizontal line as inPt
					if ( ( ( edgeHighPt.x <= inPt.x ) && ( inPt.x <= edgeLowPt.x ) ) ||
						 ( ( edgeLowPt.x <= inPt.x ) && ( inPt.x <= edgeHighPt.x ) ) )		return	true;	// inPt: Point on contour !
					// continue;

				}

			}

			return	inside;

		}

		const isClockWise = ShapeUtils.isClockWise;

		const subPaths = this.subPaths;
		if ( subPaths.length === 0 ) return [];

		let solid, tmpPath, tmpShape;
		const shapes = [];

		if ( subPaths.length === 1 ) {

			tmpPath = subPaths[ 0 ];
			tmpShape = new Shape();
			tmpShape.curves = tmpPath.curves;
			shapes.push( tmpShape );
			return shapes;

		}

		let holesFirst = ! isClockWise( subPaths[ 0 ].getPoints() );
		holesFirst = isCCW ? ! holesFirst : holesFirst;

		// console.log("Holes first", holesFirst);

		const betterShapeHoles = [];
		const newShapes = [];
		let newShapeHoles = [];
		let mainIdx = 0;
		let tmpPoints;

		newShapes[ mainIdx ] = undefined;
		newShapeHoles[ mainIdx ] = [];

		for ( let i = 0, l = subPaths.length; i < l; i ++ ) {

			tmpPath = subPaths[ i ];
			tmpPoints = tmpPath.getPoints();
			solid = isClockWise( tmpPoints );
			solid = isCCW ? ! solid : solid;

			if ( solid ) {

				if ( ( ! holesFirst ) && ( newShapes[ mainIdx ] ) )	mainIdx ++;

				newShapes[ mainIdx ] = { s: new Shape(), p: tmpPoints };
				newShapes[ mainIdx ].s.curves = tmpPath.curves;

				if ( holesFirst )	mainIdx ++;
				newShapeHoles[ mainIdx ] = [];

				//console.log('cw', i);

			} else {

				newShapeHoles[ mainIdx ].push( { h: tmpPath, p: tmpPoints[ 0 ] } );

				//console.log('ccw', i);

			}

		}

		// only Holes? -> probably all Shapes with wrong orientation
		if ( ! newShapes[ 0 ] )	return	toShapesNoHoles( subPaths );


		if ( newShapes.length > 1 ) {

			let ambiguous = false;
			let toChange = 0;

			for ( let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx ++ ) {

				betterShapeHoles[ sIdx ] = [];

			}

			for ( let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx ++ ) {

				const sho = newShapeHoles[ sIdx ];

				for ( let hIdx = 0; hIdx < sho.length; hIdx ++ ) {

					const ho = sho[ hIdx ];
					let hole_unassigned = true;

					for ( let s2Idx = 0; s2Idx < newShapes.length; s2Idx ++ ) {

						if ( isPointInsidePolygon( ho.p, newShapes[ s2Idx ].p ) ) {

							if ( sIdx !== s2Idx )	toChange ++;

							if ( hole_unassigned ) {

								hole_unassigned = false;
								betterShapeHoles[ s2Idx ].push( ho );

							} else {

								ambiguous = true;

							}

						}

					}

					if ( hole_unassigned ) {

						betterShapeHoles[ sIdx ].push( ho );

					}

				}

			}

			if ( toChange > 0 && ambiguous === false ) {

				newShapeHoles = betterShapeHoles;

			}

		}

		let tmpHoles;

		for ( let i = 0, il = newShapes.length; i < il; i ++ ) {

			tmpShape = newShapes[ i ].s;
			shapes.push( tmpShape );
			tmpHoles = newShapeHoles[ i ];

			for ( let j = 0, jl = tmpHoles.length; j < jl; j ++ ) {

				tmpShape.holes.push( tmpHoles[ j ].h );

			}

		}

		//console.log("shape", shapes);

		return shapes;

	}

}

/**
 * Abstract base class for controls.
 *
 * @abstract
 * @augments EventDispatcher
 */
class Controls extends EventDispatcher {

	/**
	 * Constructs a new controls instance.
	 *
	 * @param {Object3D} object - The object that is managed by the controls.
	 * @param {?HTMLDOMElement} domElement - The HTML element used for event listeners.
	 */
	constructor( object, domElement = null ) {

		super();

		/**
		 * The object that is managed by the controls.
		 *
		 * @type {Object3D}
		 */
		this.object = object;

		/**
		 * The HTML element used for event listeners.
		 *
		 * @type {?HTMLDOMElement}
		 * @default null
		 */
		this.domElement = domElement;

		/**
		 * Whether the controls responds to user input or not.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.enabled = true;

		/**
		 * The internal state of the controls.
		 *
		 * @type {number}
		 * @default -1
		 */
		this.state = -1;

		/**
		 * This object defines the keyboard input of the controls.
		 *
		 * @type {Object}
		 */
		this.keys = {};

		/**
		 * This object defines what type of actions are assigned to the available mouse buttons.
		 * It depends on the control implementation what kind of mouse buttons and actions are supported.
		 *
		 * @type {{LEFT: ?number, MIDDLE: ?number, RIGHT: ?number}}
		 */
		this.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: null };

		/**
		 * This object defines what type of actions are assigned to what kind of touch interaction.
		 * It depends on the control implementation what kind of touch interaction and actions are supported.
		 *
		 * @type {{ONE: ?number, TWO: ?number}}
		 */
		this.touches = { ONE: null, TWO: null };

	}

	/**
	 * Connects the controls to the DOM. This method has so called "side effects" since
	 * it adds the module's event listeners to the DOM.
	 *
	 * @param {HTMLDOMElement} element - The DOM element to connect to.
	 */
	connect( element ) {

		if ( element === undefined ) {

			console.warn( 'THREE.Controls: connect() now requires an element.' ); // @deprecated, the warning can be removed with r185
			return;

		}

		if ( this.domElement !== null ) this.disconnect();

		this.domElement = element;

	}

	/**
	 * Disconnects the controls from the DOM.
	 */
	disconnect() {}

	/**
	 * Call this method if you no longer want use to the controls. It frees all internal
	 * resources and removes all event listeners.
	 */
	dispose() {}

	/**
	 * Controls should implement this method if they have to update their internal state
	 * per simulation step.
	 *
	 * @param {number} [delta] - The time delta in seconds.
	 */
	update( /* delta */ ) {}

}

/**
 * Scales the texture as large as possible within its surface without cropping
 * or stretching the texture. The method preserves the original aspect ratio of
 * the texture. Akin to CSS `object-fit: contain`
 *
 * @param {Texture} texture - The texture.
 * @param {number} aspect - The texture's aspect ratio.
 * @return {Texture} The updated texture.
 */
function contain( texture, aspect ) {

	const imageAspect = ( texture.image && texture.image.width ) ? texture.image.width / texture.image.height : 1;

	if ( imageAspect > aspect ) {

		texture.repeat.x = 1;
		texture.repeat.y = imageAspect / aspect;

		texture.offset.x = 0;
		texture.offset.y = ( 1 - texture.repeat.y ) / 2;

	} else {

		texture.repeat.x = aspect / imageAspect;
		texture.repeat.y = 1;

		texture.offset.x = ( 1 - texture.repeat.x ) / 2;
		texture.offset.y = 0;

	}

	return texture;

}

/**
 * Scales the texture to the smallest possible size to fill the surface, leaving
 * no empty space. The method preserves the original aspect ratio of the texture.
 * Akin to CSS `object-fit: cover`.
 *
 * @param {Texture} texture - The texture.
 * @param {number} aspect - The texture's aspect ratio.
 * @return {Texture} The updated texture.
 */
function cover( texture, aspect ) {

	const imageAspect = ( texture.image && texture.image.width ) ? texture.image.width / texture.image.height : 1;

	if ( imageAspect > aspect ) {

		texture.repeat.x = aspect / imageAspect;
		texture.repeat.y = 1;

		texture.offset.x = ( 1 - texture.repeat.x ) / 2;
		texture.offset.y = 0;

	} else {

		texture.repeat.x = 1;
		texture.repeat.y = imageAspect / aspect;

		texture.offset.x = 0;
		texture.offset.y = ( 1 - texture.repeat.y ) / 2;

	}

	return texture;

}

/**
 * Configures the texture to the default transformation. Akin to CSS `object-fit: fill`.
 *
 * @param {Texture} texture - The texture.
 * @return {Texture} The updated texture.
 */
function fill( texture ) {

	texture.repeat.x = 1;
	texture.repeat.y = 1;

	texture.offset.x = 0;
	texture.offset.y = 0;

	return texture;

}

/**
 * Determines how many bytes must be used to represent the texture.
 *
 * @param {number} width - The width of the texture.
 * @param {number} height - The height of the texture.
 * @param {number} format - The texture's format.
 * @param {number} type - The texture's type.
 * @return {number} The byte length.
 */
function getByteLength( width, height, format, type ) {

	const typeByteLength = getTextureTypeByteLength( type );

	switch ( format ) {

		// https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml
		case AlphaFormat:
			return width * height;
		case RedFormat:
			return ( ( width * height ) / typeByteLength.components ) * typeByteLength.byteLength;
		case RedIntegerFormat:
			return ( ( width * height ) / typeByteLength.components ) * typeByteLength.byteLength;
		case RGFormat:
			return ( ( width * height * 2 ) / typeByteLength.components ) * typeByteLength.byteLength;
		case RGIntegerFormat:
			return ( ( width * height * 2 ) / typeByteLength.components ) * typeByteLength.byteLength;
		case RGBFormat:
			return ( ( width * height * 3 ) / typeByteLength.components ) * typeByteLength.byteLength;
		case RGBAFormat:
			return ( ( width * height * 4 ) / typeByteLength.components ) * typeByteLength.byteLength;
		case RGBAIntegerFormat:
			return ( ( width * height * 4 ) / typeByteLength.components ) * typeByteLength.byteLength;

		// https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_s3tc_srgb/
		case RGB_S3TC_DXT1_Format:
		case RGBA_S3TC_DXT1_Format:
			return Math.floor( ( width + 3 ) / 4 ) * Math.floor( ( height + 3 ) / 4 ) * 8;
		case RGBA_S3TC_DXT3_Format:
		case RGBA_S3TC_DXT5_Format:
			return Math.floor( ( width + 3 ) / 4 ) * Math.floor( ( height + 3 ) / 4 ) * 16;

		// https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_pvrtc/
		case RGB_PVRTC_2BPPV1_Format:
		case RGBA_PVRTC_2BPPV1_Format:
			return ( Math.max( width, 16 ) * Math.max( height, 8 ) ) / 4;
		case RGB_PVRTC_4BPPV1_Format:
		case RGBA_PVRTC_4BPPV1_Format:
			return ( Math.max( width, 8 ) * Math.max( height, 8 ) ) / 2;

		// https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc/
		case RGB_ETC1_Format:
		case RGB_ETC2_Format:
			return Math.floor( ( width + 3 ) / 4 ) * Math.floor( ( height + 3 ) / 4 ) * 8;
		case RGBA_ETC2_EAC_Format:
			return Math.floor( ( width + 3 ) / 4 ) * Math.floor( ( height + 3 ) / 4 ) * 16;

		// https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/
		case RGBA_ASTC_4x4_Format:
			return Math.floor( ( width + 3 ) / 4 ) * Math.floor( ( height + 3 ) / 4 ) * 16;
		case RGBA_ASTC_5x4_Format:
			return Math.floor( ( width + 4 ) / 5 ) * Math.floor( ( height + 3 ) / 4 ) * 16;
		case RGBA_ASTC_5x5_Format:
			return Math.floor( ( width + 4 ) / 5 ) * Math.floor( ( height + 4 ) / 5 ) * 16;
		case RGBA_ASTC_6x5_Format:
			return Math.floor( ( width + 5 ) / 6 ) * Math.floor( ( height + 4 ) / 5 ) * 16;
		case RGBA_ASTC_6x6_Format:
			return Math.floor( ( width + 5 ) / 6 ) * Math.floor( ( height + 5 ) / 6 ) * 16;
		case RGBA_ASTC_8x5_Format:
			return Math.floor( ( width + 7 ) / 8 ) * Math.floor( ( height + 4 ) / 5 ) * 16;
		case RGBA_ASTC_8x6_Format:
			return Math.floor( ( width + 7 ) / 8 ) * Math.floor( ( height + 5 ) / 6 ) * 16;
		case RGBA_ASTC_8x8_Format:
			return Math.floor( ( width + 7 ) / 8 ) * Math.floor( ( height + 7 ) / 8 ) * 16;
		case RGBA_ASTC_10x5_Format:
			return Math.floor( ( width + 9 ) / 10 ) * Math.floor( ( height + 4 ) / 5 ) * 16;
		case RGBA_ASTC_10x6_Format:
			return Math.floor( ( width + 9 ) / 10 ) * Math.floor( ( height + 5 ) / 6 ) * 16;
		case RGBA_ASTC_10x8_Format:
			return Math.floor( ( width + 9 ) / 10 ) * Math.floor( ( height + 7 ) / 8 ) * 16;
		case RGBA_ASTC_10x10_Format:
			return Math.floor( ( width + 9 ) / 10 ) * Math.floor( ( height + 9 ) / 10 ) * 16;
		case RGBA_ASTC_12x10_Format:
			return Math.floor( ( width + 11 ) / 12 ) * Math.floor( ( height + 9 ) / 10 ) * 16;
		case RGBA_ASTC_12x12_Format:
			return Math.floor( ( width + 11 ) / 12 ) * Math.floor( ( height + 11 ) / 12 ) * 16;

		// https://registry.khronos.org/webgl/extensions/EXT_texture_compression_bptc/
		case RGBA_BPTC_Format:
		case RGB_BPTC_SIGNED_Format:
		case RGB_BPTC_UNSIGNED_Format:
			return Math.ceil( width / 4 ) * Math.ceil( height / 4 ) * 16;

		// https://registry.khronos.org/webgl/extensions/EXT_texture_compression_rgtc/
		case RED_RGTC1_Format:
		case SIGNED_RED_RGTC1_Format:
			return Math.ceil( width / 4 ) * Math.ceil( height / 4 ) * 8;
		case RED_GREEN_RGTC2_Format:
		case SIGNED_RED_GREEN_RGTC2_Format:
			return Math.ceil( width / 4 ) * Math.ceil( height / 4 ) * 16;

	}

	throw new Error(
		`Unable to determine texture byte length for ${format} format.`,
	);

}

function getTextureTypeByteLength( type ) {

	switch ( type ) {

		case UnsignedByteType:
		case ByteType:
			return { byteLength: 1, components: 1 };
		case UnsignedShortType:
		case ShortType:
		case HalfFloatType:
			return { byteLength: 2, components: 1 };
		case UnsignedShort4444Type:
		case UnsignedShort5551Type:
			return { byteLength: 2, components: 4 };
		case UnsignedIntType:
		case IntType:
		case FloatType:
			return { byteLength: 4, components: 1 };
		case UnsignedInt5999Type:
		case UnsignedInt101111Type:
			return { byteLength: 4, components: 3 };

	}

	throw new Error( `Unknown texture type ${type}.` );

}

/**
 * A class containing utility functions for textures.
 *
 * @hideconstructor
 */
class TextureUtils {

	/**
	 * Scales the texture as large as possible within its surface without cropping
	 * or stretching the texture. The method preserves the original aspect ratio of
	 * the texture. Akin to CSS `object-fit: contain`
	 *
	 * @param {Texture} texture - The texture.
	 * @param {number} aspect - The texture's aspect ratio.
	 * @return {Texture} The updated texture.
	 */
	static contain( texture, aspect ) {

		return contain( texture, aspect );

	}

	/**
	 * Scales the texture to the smallest possible size to fill the surface, leaving
	 * no empty space. The method preserves the original aspect ratio of the texture.
	 * Akin to CSS `object-fit: cover`.
	 *
	 * @param {Texture} texture - The texture.
	 * @param {number} aspect - The texture's aspect ratio.
	 * @return {Texture} The updated texture.
	 */
	static cover( texture, aspect ) {

		return cover( texture, aspect );

	}

	/**
	 * Configures the texture to the default transformation. Akin to CSS `object-fit: fill`.
	 *
	 * @param {Texture} texture - The texture.
	 * @return {Texture} The updated texture.
	 */
	static fill( texture ) {

		return fill( texture );

	}

	/**
	 * Determines how many bytes must be used to represent the texture.
	 *
	 * @param {number} width - The width of the texture.
	 * @param {number} height - The height of the texture.
	 * @param {number} format - The texture's format.
	 * @param {number} type - The texture's type.
	 * @return {number} The byte length.
	 */
	static getByteLength( width, height, format, type ) {

		return getByteLength( width, height, format, type );

	}

}

if ( typeof __THREE_DEVTOOLS__ !== 'undefined' ) {

	__THREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'register', { detail: {
		revision: REVISION,
	} } ) );

}

if ( typeof window !== 'undefined' ) {

	if ( window.__THREE__ ) {

		console.warn( 'WARNING: Multiple instances of Three.js being imported.' );

	} else {

		window.__THREE__ = REVISION;

	}

}

export { ACESFilmicToneMapping, AddEquation, AddOperation, AdditiveAnimationBlendMode, AdditiveBlending, AgXToneMapping, AlphaFormat, AlwaysCompare, AlwaysDepth, AlwaysStencilFunc, AmbientLight, AnimationAction, AnimationClip, AnimationLoader, AnimationMixer, AnimationObjectGroup, AnimationUtils, ArcCurve, ArrayCamera, ArrowHelper, AttachedBindMode, Audio, AudioAnalyser, AudioContext, AudioListener, AudioLoader, AxesHelper, BackSide, BasicDepthPacking, BasicShadowMap, BatchedMesh, Bone, BooleanKeyframeTrack, Box2, Box3, Box3Helper, BoxGeometry, BoxHelper, BufferAttribute, BufferGeometry, BufferGeometryLoader, ByteType, Cache, Camera, CameraHelper, CanvasTexture, CapsuleGeometry, CatmullRomCurve3, CineonToneMapping, CircleGeometry, ClampToEdgeWrapping, Clock, Color, ColorKeyframeTrack, ColorManagement, CompressedArrayTexture, CompressedCubeTexture, CompressedTexture, CompressedTextureLoader, ConeGeometry, ConstantAlphaFactor, ConstantColorFactor, Controls, CubeCamera, CubeReflectionMapping, CubeRefractionMapping, CubeTexture, CubeTextureLoader, CubeUVReflectionMapping, CubicBezierCurve, CubicBezierCurve3, CubicInterpolant, CullFaceBack, CullFaceFront, CullFaceFrontBack, CullFaceNone, Curve, CurvePath, CustomBlending, CustomToneMapping, CylinderGeometry, Cylindrical, Data3DTexture, DataArrayTexture, DataTexture, DataTextureLoader, DataUtils, DecrementStencilOp, DecrementWrapStencilOp, DefaultLoadingManager, DepthFormat, DepthStencilFormat, DepthTexture, DetachedBindMode, DirectionalLight, DirectionalLightHelper, DiscreteInterpolant, DodecahedronGeometry, DoubleSide, DstAlphaFactor, DstColorFactor, DynamicCopyUsage, DynamicDrawUsage, DynamicReadUsage, EdgesGeometry, EllipseCurve, EqualCompare, EqualDepth, EqualStencilFunc, EquirectangularReflectionMapping, EquirectangularRefractionMapping, Euler, EventDispatcher, ExternalTexture, ExtrudeGeometry, FileLoader, Float16BufferAttribute, Float32BufferAttribute, FloatType, Fog, FogExp2, FramebufferTexture, FrontSide, Frustum, FrustumArray, GLBufferAttribute, GLSL1, GLSL3, GreaterCompare, GreaterDepth, GreaterEqualCompare, GreaterEqualDepth, GreaterEqualStencilFunc, GreaterStencilFunc, GridHelper, Group, HalfFloatType, HemisphereLight, HemisphereLightHelper, IcosahedronGeometry, ImageBitmapLoader, ImageLoader, ImageUtils, IncrementStencilOp, IncrementWrapStencilOp, InstancedBufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer, InstancedMesh, Int16BufferAttribute, Int32BufferAttribute, Int8BufferAttribute, IntType, InterleavedBuffer, InterleavedBufferAttribute, Interpolant, InterpolateDiscrete, InterpolateLinear, InterpolateSmooth, InterpolationSamplingMode, InterpolationSamplingType, InvertStencilOp, KeepStencilOp, KeyframeTrack, LOD, LatheGeometry, Layers, LessCompare, LessDepth, LessEqualCompare, LessEqualDepth, LessEqualStencilFunc, LessStencilFunc, Light, LightProbe, Line, Line3, LineBasicMaterial, LineCurve, LineCurve3, LineDashedMaterial, LineLoop, LineSegments, LinearFilter, LinearInterpolant, LinearMipMapLinearFilter, LinearMipMapNearestFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, LinearToneMapping, LinearTransfer, Loader, LoaderUtils, LoadingManager, LoopOnce, LoopPingPong, LoopRepeat, MOUSE, Material, MaterialLoader, MathUtils, Matrix2, Matrix3, Matrix4, MaxEquation, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshDistanceMaterial, MeshLambertMaterial, MeshMatcapMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, MinEquation, MirroredRepeatWrapping, MixOperation, MultiplyBlending, MultiplyOperation, NearestFilter, NearestMipMapLinearFilter, NearestMipMapNearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, NeutralToneMapping, NeverCompare, NeverDepth, NeverStencilFunc, NoBlending, NoColorSpace, NoToneMapping, NormalAnimationBlendMode, NormalBlending, NotEqualCompare, NotEqualDepth, NotEqualStencilFunc, NumberKeyframeTrack, Object3D, ObjectLoader, ObjectSpaceNormalMap, OctahedronGeometry, OneFactor, OneMinusConstantAlphaFactor, OneMinusConstantColorFactor, OneMinusDstAlphaFactor, OneMinusDstColorFactor, OneMinusSrcAlphaFactor, OneMinusSrcColorFactor, OrthographicCamera, PCFShadowMap, PCFSoftShadowMap, Path, PerspectiveCamera, Plane, PlaneGeometry, PlaneHelper, PointLight, PointLightHelper, Points, PointsMaterial, PolarGridHelper, PolyhedronGeometry, PositionalAudio, PropertyBinding, PropertyMixer, QuadraticBezierCurve, QuadraticBezierCurve3, Quaternion, QuaternionKeyframeTrack, QuaternionLinearInterpolant, RAD2DEG, RED_GREEN_RGTC2_Format, RED_RGTC1_Format, REVISION, RGBADepthPacking, RGBAFormat, RGBAIntegerFormat, RGBA_ASTC_10x10_Format, RGBA_ASTC_10x5_Format, RGBA_ASTC_10x6_Format, RGBA_ASTC_10x8_Format, RGBA_ASTC_12x10_Format, RGBA_ASTC_12x12_Format, RGBA_ASTC_4x4_Format, RGBA_ASTC_5x4_Format, RGBA_ASTC_5x5_Format, RGBA_ASTC_6x5_Format, RGBA_ASTC_6x6_Format, RGBA_ASTC_8x5_Format, RGBA_ASTC_8x6_Format, RGBA_ASTC_8x8_Format, RGBA_BPTC_Format, RGBA_ETC2_EAC_Format, RGBA_PVRTC_2BPPV1_Format, RGBA_PVRTC_4BPPV1_Format, RGBA_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGBDepthPacking, RGBFormat, RGBIntegerFormat, RGB_BPTC_SIGNED_Format, RGB_BPTC_UNSIGNED_Format, RGB_ETC1_Format, RGB_ETC2_Format, RGB_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGB_S3TC_DXT1_Format, RGDepthPacking, RGFormat, RGIntegerFormat, RawShaderMaterial, Ray, Raycaster, RectAreaLight, RedFormat, RedIntegerFormat, ReinhardToneMapping, RenderTarget, RenderTarget3D, RepeatWrapping, ReplaceStencilOp, ReverseSubtractEquation, RingGeometry, SIGNED_RED_GREEN_RGTC2_Format, SIGNED_RED_RGTC1_Format, SRGBColorSpace, SRGBTransfer, Scene, ShaderMaterial, ShadowMaterial, Shape, ShapeGeometry, ShapePath, ShapeUtils, ShortType, Skeleton, SkeletonHelper, SkinnedMesh, Source, Sphere, SphereGeometry, Spherical, SphericalHarmonics3, SplineCurve, SpotLight, SpotLightHelper, Sprite, SpriteMaterial, SrcAlphaFactor, SrcAlphaSaturateFactor, SrcColorFactor, StaticCopyUsage, StaticDrawUsage, StaticReadUsage, StereoCamera, StreamCopyUsage, StreamDrawUsage, StreamReadUsage, StringKeyframeTrack, SubtractEquation, SubtractiveBlending, TOUCH, TangentSpaceNormalMap, TetrahedronGeometry, Texture, TextureLoader, TextureUtils, Timer, TimestampQuery, TorusGeometry, TorusKnotGeometry, Triangle, TriangleFanDrawMode, TriangleStripDrawMode, TrianglesDrawMode, TubeGeometry, UVMapping, Uint16BufferAttribute, Uint32BufferAttribute, Uint8BufferAttribute, Uint8ClampedBufferAttribute, Uniform, UniformsGroup, UniformsUtils, UnsignedByteType, UnsignedInt101111Type, UnsignedInt248Type, UnsignedInt5999Type, UnsignedIntType, UnsignedShort4444Type, UnsignedShort5551Type, UnsignedShortType, VSMShadowMap, Vector2, Vector3, Vector4, VectorKeyframeTrack, VideoFrameTexture, VideoTexture, WebGL3DRenderTarget, WebGLArrayRenderTarget, WebGLCoordinateSystem, WebGLCubeRenderTarget, WebGLRenderTarget, WebGPUCoordinateSystem, WebXRController, WireframeGeometry, WrapAroundEnding, ZeroCurvatureEnding, ZeroFactor, ZeroSlopeEnding, ZeroStencilOp, arrayNeedsUint32, cloneUniforms, createCanvasElement, createElementNS, getByteLength, getUnlitUniformColorSpace, mergeUniforms, probeAsync, warnOnce };
