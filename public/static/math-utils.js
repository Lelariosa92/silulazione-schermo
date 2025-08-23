/**
 * Utilità matematiche per trasformazioni prospettiche e matrici omografia 3×3
 * 
 * Implementa algoritmi per:
 * - Calcolo matrice omografia da 4 coppie di punti corrispondenti
 * - Trasformazioni prospettiche di punti e immagini
 * - Operazioni su matrici 3×3
 * - Interpolazione bilineare per rendering video
 */

class MathUtils {
    /**
     * Calcola matrice omografia 3×3 da punti sorgente e destinazione
     * @param {Array} srcPoints - Array di 4 punti [x, y] sorgente
     * @param {Array} dstPoints - Array di 4 punti [x, y] destinazione
     * @returns {Array} Matrice omografia 3×3
     */
    static calculateHomography(srcPoints, dstPoints) {
        if (srcPoints.length !== 4 || dstPoints.length !== 4) {
            throw new Error('Servono esattamente 4 punti per calcolare omografia');
        }

        // Costruisce sistema lineare Ax = b per risolvere omografia
        // h = [h00, h01, h02, h10, h11, h12, h20, h21] (h22 = 1)
        const A = [];
        const b = [];

        for (let i = 0; i < 4; i++) {
            const [x, y] = srcPoints[i];
            const [u, v] = dstPoints[i];

            // Equazioni per coordinata x
            A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
            b.push(u);

            // Equazioni per coordinata y
            A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
            b.push(v);
        }

        // Risolve sistema lineare Ax = b
        const h = this.solveLeastSquares(A, b);

        // Ricostruisce matrice 3×3
        return [
            [h[0], h[1], h[2]],
            [h[3], h[4], h[5]],
            [h[6], h[7], 1.0]
        ];
    }

    /**
     * Risolve sistema lineare con metodo least squares (pseudo-inversa)
     * @param {Array} A - Matrice coefficienti
     * @param {Array} b - Vettore termini noti
     * @returns {Array} Soluzione x
     */
    static solveLeastSquares(A, b) {
        const m = A.length; // righe
        const n = A[0].length; // colonne

        // Calcola A^T * A
        const AtA = [];
        for (let i = 0; i < n; i++) {
            AtA[i] = [];
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let k = 0; k < m; k++) {
                    sum += A[k][i] * A[k][j];
                }
                AtA[i][j] = sum;
            }
        }

        // Calcola A^T * b
        const Atb = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < m; j++) {
                sum += A[j][i] * b[j];
            }
            Atb[i] = sum;
        }

        // Risolve (A^T * A) * x = A^T * b con eliminazione Gaussiana
        return this.gaussianElimination(AtA, Atb);
    }

    /**
     * Eliminazione gaussiana per sistema lineare
     * @param {Array} A - Matrice coefficienti (verrà modificata)
     * @param {Array} b - Vettore termini noti (verrà modificato)
     * @returns {Array} Soluzione
     */
    static gaussianElimination(A, b) {
        const n = A.length;
        
        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Trova pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                    maxRow = k;
                }
            }

            // Scambia righe
            [A[i], A[maxRow]] = [A[maxRow], A[i]];
            [b[i], b[maxRow]] = [b[maxRow], b[i]];

            // Elimina colonna
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[i][i]) < 1e-10) continue; // Evita divisione per zero
                
                const factor = A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    A[k][j] -= factor * A[i][j];
                }
                b[k] -= factor * b[i];
            }
        }

        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = b[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= A[i][j] * x[j];
            }
            if (Math.abs(A[i][i]) > 1e-10) {
                x[i] /= A[i][i];
            }
        }

        return x;
    }

    /**
     * Applica trasformazione omografica a un punto
     * @param {Array} point - Punto [x, y]
     * @param {Array} homography - Matrice omografia 3×3
     * @returns {Array} Punto trasformato [x, y]
     */
    static transformPoint(point, homography) {
        const [x, y] = point;
        const [h] = homography;

        const w = h[2][0] * x + h[2][1] * y + h[2][2];
        
        if (Math.abs(w) < 1e-10) {
            return [x, y]; // Evita divisione per zero
        }

        return [
            (h[0][0] * x + h[0][1] * y + h[0][2]) / w,
            (h[1][0] * x + h[1][1] * y + h[1][2]) / w
        ];
    }

    /**
     * Calcola inversa di matrice omografia 3×3
     * @param {Array} H - Matrice omografia 3×3
     * @returns {Array} Matrice inversa 3×3
     */
    static invertHomography(H) {
        // Calcola determinante
        const det = H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) -
                   H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) +
                   H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);

        if (Math.abs(det) < 1e-10) {
            throw new Error('Matrice singolare - impossibile calcolare inversa');
        }

        // Calcola matrice aggiunta e dividi per determinante
        const inv = [
            [
                (H[1][1] * H[2][2] - H[1][2] * H[2][1]) / det,
                (H[0][2] * H[2][1] - H[0][1] * H[2][2]) / det,
                (H[0][1] * H[1][2] - H[0][2] * H[1][1]) / det
            ],
            [
                (H[1][2] * H[2][0] - H[1][0] * H[2][2]) / det,
                (H[0][0] * H[2][2] - H[0][2] * H[2][0]) / det,
                (H[0][2] * H[1][0] - H[0][0] * H[1][2]) / det
            ],
            [
                (H[1][0] * H[2][1] - H[1][1] * H[2][0]) / det,
                (H[0][1] * H[2][0] - H[0][0] * H[2][1]) / det,
                (H[0][0] * H[1][1] - H[0][1] * H[1][0]) / det
            ]
        ];

        return inv;
    }

    /**
     * Interpolazione bilineare per sampling pixel
     * @param {ImageData} imageData - Dati immagine sorgente
     * @param {number} x - Coordinata x (può essere non intera)
     * @param {number} y - Coordinata y (può essere non intera)
     * @returns {Array} Pixel interpolato [r, g, b, a]
     */
    static bilinearInterpolation(imageData, x, y) {
        const { data, width, height } = imageData;
        
        // Clamp alle dimensioni immagine
        x = Math.max(0, Math.min(width - 1, x));
        y = Math.max(0, Math.min(height - 1, y));

        const x1 = Math.floor(x);
        const y1 = Math.floor(y);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);

        const dx = x - x1;
        const dy = y - y1;

        // Ottieni 4 pixel agli angoli
        const getPixel = (px, py) => {
            const idx = (py * width + px) * 4;
            return [
                data[idx],     // r
                data[idx + 1], // g
                data[idx + 2], // b
                data[idx + 3]  // a
            ];
        };

        const tl = getPixel(x1, y1); // top-left
        const tr = getPixel(x2, y1); // top-right
        const bl = getPixel(x1, y2); // bottom-left
        const br = getPixel(x2, y2); // bottom-right

        // Interpolazione bilineare per ogni canale
        const result = [];
        for (let i = 0; i < 4; i++) {
            const top = tl[i] * (1 - dx) + tr[i] * dx;
            const bottom = bl[i] * (1 - dx) + br[i] * dx;
            result[i] = Math.round(top * (1 - dy) + bottom * dy);
        }

        return result;
    }

    /**
     * Calcola bounding box di punti trasformati
     * @param {Array} points - Array di punti [x, y]
     * @param {Array} homography - Matrice omografia 3×3
     * @returns {Object} {minX, minY, maxX, maxY}
     */
    static calculateTransformedBounds(points, homography) {
        const transformed = points.map(p => this.transformPoint(p, homography));
        
        return {
            minX: Math.min(...transformed.map(p => p[0])),
            minY: Math.min(...transformed.map(p => p[1])),
            maxX: Math.max(...transformed.map(p => p[0])),
            maxY: Math.max(...transformed.map(p => p[1]))
        };
    }

    /**
     * Calcola errore di reproiezione tra punti attesi e trasformati
     * @param {Array} srcPoints - Punti sorgente
     * @param {Array} dstPoints - Punti destinazione attesi
     * @param {Array} homography - Matrice omografia
     * @returns {number} Errore RMS in pixel
     */
    static calculateReprojectionError(srcPoints, dstPoints, homography) {
        let totalError = 0;
        const n = srcPoints.length;

        for (let i = 0; i < n; i++) {
            const transformed = this.transformPoint(srcPoints[i], homography);
            const expected = dstPoints[i];
            
            const dx = transformed[0] - expected[0];
            const dy = transformed[1] - expected[1];
            totalError += dx * dx + dy * dy;
        }

        return Math.sqrt(totalError / n);
    }

    /**
     * Normalizza matrice omografia (rende h22 = 1)
     * @param {Array} homography - Matrice 3×3
     * @returns {Array} Matrice normalizzata
     */
    static normalizeHomography(homography) {
        const h22 = homography[2][2];
        if (Math.abs(h22) < 1e-10) {
            throw new Error('Matrice omografia invalida (h22 ≈ 0)');
        }

        return homography.map(row => 
            row.map(val => val / h22)
        );
    }

    /**
     * Verifica se un punto è all'interno del quadrilatero definito dai corner points
     * @param {Array} point - Punto [x, y] da testare
     * @param {Array} corners - 4 corner points in ordine [TL, TR, BR, BL]
     * @returns {boolean} True se il punto è interno
     */
    static isPointInsideQuad(point, corners) {
        const [x, y] = point;
        const [tl, tr, br, bl] = corners;

        // Usa algoritmo point-in-polygon (ray casting)
        let inside = false;
        const polygon = [tl, tr, br, bl, tl]; // Chiudi il poligono

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            if (((yi > y) !== (yj > y)) && 
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * Calcola area del quadrilatero definito dai corner points
     * @param {Array} corners - 4 corner points [TL, TR, BR, BL]
     * @returns {number} Area in pixel quadrati
     */
    static calculateQuadArea(corners) {
        // Formula shoelace per area poligono
        const [tl, tr, br, bl] = corners;
        const vertices = [tl, tr, br, bl, tl]; // Chiudi il poligono
        
        let area = 0;
        for (let i = 0; i < vertices.length - 1; i++) {
            area += vertices[i][0] * vertices[i + 1][1];
            area -= vertices[i + 1][0] * vertices[i][1];
        }
        
        return Math.abs(area) / 2;
    }

    /**
     * Genera matrice identità 3×3
     * @returns {Array} Matrice identità
     */
    static identityMatrix3x3() {
        return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    /**
     * Moltiplica due matrici 3×3
     * @param {Array} A - Prima matrice
     * @param {Array} B - Seconda matrice
     * @returns {Array} Prodotto A * B
     */
    static multiplyMatrix3x3(A, B) {
        const result = [];
        
        for (let i = 0; i < 3; i++) {
            result[i] = [];
            for (let j = 0; j < 3; j++) {
                result[i][j] = 0;
                for (let k = 0; k < 3; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }

    /**
     * Converte matrice in stringa formattata per display
     * @param {Array} matrix - Matrice 3×3
     * @param {number} precision - Decimali da mostrare
     * @returns {string} Stringa formattata
     */
    static matrixToString(matrix, precision = 6) {
        return matrix
            .map(row => '[' + row.map(val => val.toFixed(precision)).join(', ') + ']')
            .join(',\\n');
    }
}

// Export per utilizzo globale
if (typeof window !== 'undefined') {
    window.MathUtils = MathUtils;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathUtils;
}