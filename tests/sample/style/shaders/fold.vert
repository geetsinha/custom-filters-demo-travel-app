/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

precision mediump float;

// Built-in attributes.

attribute vec4 a_position;
attribute vec2 a_texCoord;
attribute vec2 a_meshCoord;
attribute vec3 a_triangleCoord;

// Built-in uniforms.

uniform mat4 u_projectionMatrix;
uniform vec2 u_textureSize;

// Uniforms passed-in from CSS

uniform mat4 transform;

uniform float mapDepth;
uniform float t;
uniform float shadow;

// Varyings

varying float v_lighting;

// Constants

const float PI = 3.1415629;

// Main

void main()
{
    vec4 pos = a_position;
    bool rightSide = (a_triangleCoord.z == 2.0 || a_triangleCoord.z == 3.0 || a_triangleCoord.z == 5.0);
    float coord = a_triangleCoord.x + (rightSide ? 1.0 : 0.0);
    if (coord > 0.0)
        pos.z = (1.0 - cos(coord * PI)) * mapDepth * t;
    pos.x = pos.x * (1.0 - t) - 0.5 * t;
    v_lighting = 1.0 - mod(a_triangleCoord.x, 2.0) * (1.0 - shadow);
    gl_Position = u_projectionMatrix * transform * pos;
}
