// Simple QR Code Generator
// Based on QR Code algorithm - creates a canvas-based QR code
(function (window) {
    'use strict';

    function QRCode(element, options) {
        this._el = element;
        this._htOption = options;

        if (typeof options === 'string') {
            options = { text: options };
        }

        this._htOption = {
            width: options.width || 256,
            height: options.height || 256,
            colorDark: options.colorDark || '#000000',
            colorLight: options.colorLight || '#ffffff',
            correctLevel: options.correctLevel || 2
        };

        if (options.text) {
            this.makeCode(options.text);
        }
    }

    QRCode.prototype.makeCode = function (sText) {
        this._oQRCode = new QRCodeModel(-1, this._htOption.correctLevel);
        this._oQRCode.addData(sText);
        this._oQRCode.make();
        this._el.innerHTML = this._createCanvas();
    };

    QRCode.prototype._createCanvas = function () {
        const nCount = this._oQRCode.getModuleCount();
        const nWidth = this._htOption.width;
        const nHeight = this._htOption.height;
        const nSize = Math.floor(Math.min(nWidth / nCount, nHeight / nCount));

        let html = '<table style="border:0;border-collapse:collapse;margin:0 auto;">';
        for (let row = 0; row < nCount; row++) {
            html += '<tr style="height:' + nSize + 'px">';
            for (let col = 0; col < nCount; col++) {
                html += '<td style="width:' + nSize + 'px;height:' + nSize + 'px;background:' +
                    (this._oQRCode.isDark(row, col) ? this._htOption.colorDark : this._htOption.colorLight) +
                    '"></td>';
            }
            html += '</tr>';
        }
        html += '</table>';
        return html;
    };

    // QR Code Model
    function QRCodeModel(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRCodeModel.prototype = {
        addData: function (data) {
            this.dataList.push({ mode: 4, data: data });
            this.dataCache = null;
        },

        isDark: function (row, col) {
            if (this.modules[row][col] != null) {
                return this.modules[row][col];
            } else {
                return false;
            }
        },

        getModuleCount: function () {
            return this.moduleCount;
        },

        make: function () {
            if (this.typeNumber < 1) {
                let typeNumber = 1;
                for (; typeNumber < 40; typeNumber++) {
                    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
                    const buffer = [];
                    let totalDataCount = 0;
                    for (let i = 0; i < rsBlocks.length; i++) {
                        totalDataCount += rsBlocks[i].dataCount;
                    }
                    for (let i = 0; i < this.dataList.length; i++) {
                        const data = this.dataList[i];
                        buffer.push(4); // mode
                        buffer.push(data.data.length >> 8);
                        buffer.push(data.data.length & 0xff);
                        for (let j = 0; j < data.data.length; j++) {
                            buffer.push(data.data.charCodeAt(j));
                        }
                    }
                    if (buffer.length <= totalDataCount * 8) {
                        break;
                    }
                }
                this.typeNumber = typeNumber;
            }
            this.makeImpl(false, this.getBestMaskPattern());
        },

        makeImpl: function (test, maskPattern) {
            this.moduleCount = this.typeNumber * 4 + 17;
            this.modules = new Array(this.moduleCount);
            for (let row = 0; row < this.moduleCount; row++) {
                this.modules[row] = new Array(this.moduleCount);
                for (let col = 0; col < this.moduleCount; col++) {
                    this.modules[row][col] = null;
                }
            }
            this.setupPositionProbePattern(0, 0);
            this.setupPositionProbePattern(this.moduleCount - 7, 0);
            this.setupPositionProbePattern(0, this.moduleCount - 7);
            this.setupPositionAdjustPattern();
            this.setupTimingPattern();
            this.setupTypeInfo(test, maskPattern);
            if (this.typeNumber >= 7) {
                this.setupTypeNumber(test);
            }
            if (this.dataCache == null) {
                this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
            }
            this.mapData(this.dataCache, maskPattern);
        },

        setupPositionProbePattern: function (row, col) {
            for (let r = -1; r <= 7; r++) {
                if (row + r <= -1 || this.moduleCount <= row + r) continue;
                for (let c = -1; c <= 7; c++) {
                    if (col + c <= -1 || this.moduleCount <= col + c) continue;
                    if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
                        (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
                        (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                        this.modules[row + r][col + c] = true;
                    } else {
                        this.modules[row + r][col + c] = false;
                    }
                }
            }
        },

        getBestMaskPattern: function () {
            let minLostPoint = 0;
            let pattern = 0;
            for (let i = 0; i < 8; i++) {
                this.makeImpl(true, i);
                const lostPoint = QRUtil.getLostPoint(this);
                if (i == 0 || minLostPoint > lostPoint) {
                    minLostPoint = lostPoint;
                    pattern = i;
                }
            }
            return pattern;
        },

        setupTimingPattern: function () {
            for (let r = 8; r < this.moduleCount - 8; r++) {
                if (this.modules[r][6] != null) continue;
                this.modules[r][6] = (r % 2 == 0);
            }
            for (let c = 8; c < this.moduleCount - 8; c++) {
                if (this.modules[6][c] != null) continue;
                this.modules[6][c] = (c % 2 == 0);
            }
        },

        setupPositionAdjustPattern: function () {
            const pos = QRUtil.getPatternPosition(this.typeNumber);
            for (let i = 0; i < pos.length; i++) {
                for (let j = 0; j < pos.length; j++) {
                    const row = pos[i];
                    const col = pos[j];
                    if (this.modules[row][col] != null) continue;
                    for (let r = -2; r <= 2; r++) {
                        for (let c = -2; c <= 2; c++) {
                            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                                this.modules[row + r][col + c] = true;
                            } else {
                                this.modules[row + r][col + c] = false;
                            }
                        }
                    }
                }
            }
        },

        setupTypeNumber: function (test) {
            const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
            for (let i = 0; i < 18; i++) {
                const mod = (!test && ((bits >> i) & 1) == 1);
                this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
            }
            for (let i = 0; i < 18; i++) {
                const mod = (!test && ((bits >> i) & 1) == 1);
                this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
            }
        },

        setupTypeInfo: function (test, maskPattern) {
            const data = (this.errorCorrectLevel << 3) | maskPattern;
            const bits = QRUtil.getBCHTypeInfo(data);
            for (let i = 0; i < 15; i++) {
                const mod = (!test && ((bits >> i) & 1) == 1);
                if (i < 6) {
                    this.modules[i][8] = mod;
                } else if (i < 8) {
                    this.modules[i + 1][8] = mod;
                } else {
                    this.modules[this.moduleCount - 15 + i][8] = mod;
                }
            }
            for (let i = 0; i < 15; i++) {
                const mod = (!test && ((bits >> i) & 1) == 1);
                if (i < 8) {
                    this.modules[8][this.moduleCount - i - 1] = mod;
                } else if (i < 9) {
                    this.modules[8][15 - i - 1 + 1] = mod;
                } else {
                    this.modules[8][15 - i - 1] = mod;
                }
            }
            this.modules[this.moduleCount - 8][8] = (!test);
        },

        mapData: function (data, maskPattern) {
            let inc = -1;
            let row = this.moduleCount - 1;
            let bitIndex = 7;
            let byteIndex = 0;
            for (let col = this.moduleCount - 1; col > 0; col -= 2) {
                if (col == 6) col--;
                while (true) {
                    for (let c = 0; c < 2; c++) {
                        if (this.modules[row][col - c] == null) {
                            let dark = false;
                            if (byteIndex < data.length) {
                                dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                            }
                            const mask = QRUtil.getMask(maskPattern, row, col - c);
                            if (mask) {
                                dark = !dark;
                            }
                            this.modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex == -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || this.moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        }
    };

    QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
        const buffer = [];
        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            buffer.push(4); // mode: byte
            buffer.push(data.data.length >> 8);
            buffer.push(data.data.length & 0xff);
            for (let j = 0; j < data.data.length; j++) {
                buffer.push(data.data.charCodeAt(j) & 0xff);
            }
        }

        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
        }

        if (buffer.length > totalDataCount * 8) {
            throw new Error("Code length overflow");
        }

        // End code
        if (buffer.length + 4 <= totalDataCount * 8) {
            buffer.push(0);
            buffer.push(0);
            buffer.push(0);
            buffer.push(0);
        }

        // Padding
        while (buffer.length < totalDataCount * 8) {
            buffer.push(0);
        }

        return buffer;
    };

    // Utility functions
    const QRUtil = {
        PATTERN_POSITION_TABLE: [
            [],
            [6, 18],
            [6, 22],
            [6, 26],
            [6, 30],
            [6, 34],
            [6, 22, 38],
            [6, 24, 42],
            [6, 26, 46],
            [6, 28, 50],
            [6, 30, 54],
            [6, 32, 58],
            [6, 34, 62],
            [6, 26, 46, 66],
            [6, 26, 48, 70],
            [6, 26, 50, 74],
            [6, 30, 54, 78],
            [6, 30, 56, 82],
            [6, 30, 58, 86],
            [6, 34, 62, 90]
        ],

        getPatternPosition: function (typeNumber) {
            return this.PATTERN_POSITION_TABLE[typeNumber - 1];
        },

        getMask: function (maskPattern, i, j) {
            switch (maskPattern) {
                case 0: return ((i + j) % 2 == 0);
                case 1: return (i % 2 == 0);
                case 2: return (j % 3 == 0);
                case 3: return ((i + j) % 3 == 0);
                case 4: return (((Math.floor(i / 2)) + Math.floor(j / 3)) % 2 == 0);
                case 5: return (((i * j) % 2) + ((i * j) % 3) == 0);
                case 6: return ((((i * j) % 2) + ((i * j) % 3)) % 2 == 0);
                case 7: return ((((i * j) % 3) + ((i + j) % 2)) % 2 == 0);
                default: throw new Error("bad maskPattern:" + maskPattern);
            }
        },

        getBCHTypeInfo: function (data) {
            let d = data << 10;
            while (this.getBCHDigit(d) - this.getBCHDigit(0x0537) >= 0) {
                d ^= (0x0537 << (this.getBCHDigit(d) - this.getBCHDigit(0x0537)));
            }
            return ((data << 10) | d) ^ 0x5412;
        },

        getBCHTypeNumber: function (data) {
            let d = data << 12;
            while (this.getBCHDigit(d) - this.getBCHDigit(0x1f25) >= 0) {
                d ^= (0x1f25 << (this.getBCHDigit(d) - this.getBCHDigit(0x1f25)));
            }
            return (data << 12) | d;
        },

        getBCHDigit: function (data) {
            let digit = 0;
            while (data != 0) {
                digit++;
                data >>>= 1;
            }
            return digit;
        },

        getLostPoint: function (qrCode) {
            const moduleCount = qrCode.getModuleCount();
            let lostPoint = 0;

            // LEVEL1
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    let sameCount = 0;
                    const dark = qrCode.isDark(row, col);
                    for (let r = -1; r <= 1; r++) {
                        if (row + r < 0 || moduleCount <= row + r) continue;
                        for (let c = -1; c <= 1; c++) {
                            if (col + c < 0 || moduleCount <= col + c) continue;
                            if (r == 0 && c == 0) continue;
                            if (dark == qrCode.isDark(row + r, col + c)) {
                                sameCount++;
                            }
                        }
                    }
                    if (sameCount > 5) {
                        lostPoint += (3 + sameCount - 5);
                    }
                }
            }

            return lostPoint;
        }
    };

    // RS Block
    function QRRSBlock(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
    }

    QRRSBlock.RS_BLOCK_TABLE = [
        [1, 26, 19],
        [1, 44, 34],
        [1, 70, 55],
        [1, 100, 80]
    ];

    QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
        const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
        const length = rsBlock.length / 3;
        const list = [];
        for (let i = 0; i < length; i++) {
            const count = rsBlock[i * 3 + 0];
            const totalCount = rsBlock[i * 3 + 1];
            const dataCount = rsBlock[i * 3 + 2];
            for (let j = 0; j < count; j++) {
                list.push(new QRRSBlock(totalCount, dataCount));
            }
        }
        return list;
    };

    QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
        const index = Math.min(typeNumber - 1, QRRSBlock.RS_BLOCK_TABLE.length - 1);
        return QRRSBlock.RS_BLOCK_TABLE[index];
    };

    window.QRCode = QRCode;
})(window);



