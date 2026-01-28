// 매출/매입계약 기안서 에디터 - 향상된 버전 (CellEditor 기반)

/**
 * CellEditor 클래스
 * 하드코딩된 테이블의 각 셀을 독립적으로 편집 가능하게 만듦
 */
class CellEditor {
    constructor() {
        this.activeCell = null;
        this.selectedCells = [];
        this.editHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        // 셀 선택 상태
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionTable = null;

        this.init();
    }

    init() {
        console.log('[CellEditor] 초기화 중...');

        // 편집 가능한 모든 셀 설정
        this.setupEditableCells();

        // 툴바 설정
        this.setupToolbar();

        // 전역 이벤트 설정
        this.setupGlobalEvents();

        // 키보드 단축키 설정
        this.setupKeyboardShortcuts();

        console.log('[CellEditor] 초기화 완료');
    }

    setupEditableCells() {
        const editableCells = document.querySelectorAll('td[contenteditable="true"]');
        console.log(`[CellEditor] 편집 가능한 셀 ${editableCells.length}개 발견`);

        editableCells.forEach(cell => {
            // 스펠체크 비활성화
            cell.setAttribute('spellcheck', 'false');
            cell.setAttribute('data-gramm', 'false');
            cell.setAttribute('autocorrect', 'off');

            // 셀 클릭 이벤트
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activateCell(cell);
            });

            // 셀 포커스 이벤트
            cell.addEventListener('focus', () => {
                this.activateCell(cell);
            });

            // 셀 입력 이벤트
            cell.addEventListener('input', () => {
                this.saveHistory();
            });

            // 마우스 다운 (드래그 선택 시작)
            cell.addEventListener('mousedown', (e) => {
                if (e.shiftKey) {
                    e.preventDefault();
                    this.startCellSelection(cell);
                }
            });

            // 마우스 오버 (드래그 선택 중)
            cell.addEventListener('mouseenter', () => {
                if (this.isSelecting) {
                    this.updateCellSelection(cell);
                }
            });
        });
    }

    setupToolbar() {
        // 실행 취소/다시 실행
        this.setupButton('undo-btn', () => this.undo());
        this.setupButton('redo-btn', () => this.redo());

        // 폰트 패밀리
        this.setupSelect('font-family', (value) => this.applyFormat('fontFamily', value));

        // 폰트 크기
        this.setupSelect('font-size', (value) => this.applyFormat('fontSize', value));

        // 텍스트 스타일
        this.setupButton('bold-btn', () => this.applyCommand('bold'));
        this.setupButton('italic-btn', () => this.applyCommand('italic'));
        this.setupButton('underline-btn', () => this.applyCommand('underline'));
        this.setupButton('strike-btn', () => this.applyCommand('strikeThrough'));
        this.setupButton('superscript-btn', () => this.applyCommand('superscript'));
        this.setupButton('subscript-btn', () => this.applyCommand('subscript'));

        // 색상
        this.setupColorPicker('text-color-input', (color) => this.applyColor('foreColor', color));
        this.setupColorPicker('highlight-color-input', (color) => this.applyColor('backColor', color));

        // 서식 지우기
        this.setupButton('clear-format-btn', () => this.clearFormat());

        // 정렬
        this.setupButton('align-left-btn', () => this.applyAlign('left'));
        this.setupButton('align-center-btn', () => this.applyAlign('center'));
        this.setupButton('align-right-btn', () => this.applyAlign('right'));
        this.setupButton('align-justify-btn', () => this.applyAlign('justify'));

        // 줄 간격
        this.setupSelect('line-height-select', (value) => this.applyLineHeight(value));

        // 단락 간격
        this.setupSelect('paragraph-spacing-select', (value) => this.applyParagraphSpacing(value));

        // 리스트
        this.setupButton('bullet-list-btn', () => this.applyCommand('insertUnorderedList'));
        this.setupButton('number-list-btn', () => this.applyCommand('insertOrderedList'));
        this.setupButton('indent-btn', () => this.applyCommand('indent'));
        this.setupButton('outdent-btn', () => this.applyCommand('outdent'));
    }

    setupButton(id, callback) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                callback();
                this.updateToolbarState();
            });
        }
    }

    setupSelect(id, callback) {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', (e) => {
                callback(e.target.value);
                this.updateToolbarState();
            });
        }
    }

    setupColorPicker(id, callback) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                callback(e.target.value);
                this.updateToolbarState();
            });
        }
    }

    setupGlobalEvents() {
        // 문서 클릭 시 셀 선택 해제 (툴바 제외)
        document.addEventListener('click', (e) => {
            const toolbar = e.target.closest('.toolbar');
            const contextMenu = e.target.closest('.table-context-menu');

            if (!toolbar && !contextMenu) {
                const cell = e.target.closest('td[contenteditable="true"]');
                if (!cell) {
                    this.deselectAllCells();
                }
            }
        });

        // 마우스 업 (드래그 선택 종료)
        document.addEventListener('mouseup', () => {
            if (this.isSelecting) {
                this.isSelecting = false;
                console.log(`[CellEditor] ${this.selectedCells.length}개 셀 선택됨`);
            }
        });

        // 선택 변경 감지
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z: 실행 취소
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z: 다시 실행
            else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
            // Ctrl+B: 굵게
            else if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.applyCommand('bold');
            }
            // Ctrl+I: 기울임
            else if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                this.applyCommand('italic');
            }
            // Ctrl+U: 밑줄
            else if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.applyCommand('underline');
            }
            // Ctrl+A: 현재 셀 전체 선택
            else if (e.ctrlKey && e.key === 'a' && this.activeCell) {
                e.preventDefault();
                this.selectCellContent(this.activeCell);
            }
        });
    }

    activateCell(cell) {
        if (this.activeCell === cell) return;

        // 이전 셀 비활성화
        if (this.activeCell) {
            this.activeCell.classList.remove('active-cell');
        }

        // 새 셀 활성화
        this.activeCell = cell;
        this.activeCell.classList.add('active-cell');

        // 툴바 상태 업데이트
        this.updateToolbarState();

        console.log('[CellEditor] 셀 활성화:', cell);
    }

    startCellSelection(cell) {
        const table = cell.closest('table');
        if (!table) return;

        this.isSelecting = true;
        this.selectionStart = cell;
        this.selectionTable = table;

        this.deselectAllCells();
        this.selectCell(cell);
    }

    updateCellSelection(cell) {
        if (!this.isSelecting || !this.selectionStart || !this.selectionTable) return;

        const table = cell.closest('table');
        if (table !== this.selectionTable) return;

        const startPos = this.getCellPosition(this.selectionStart);
        const endPos = this.getCellPosition(cell);

        if (!startPos || !endPos) return;

        const minRow = Math.min(startPos.row, endPos.row);
        const maxRow = Math.max(startPos.row, endPos.row);
        const minCol = Math.min(startPos.col, endPos.col);
        const maxCol = Math.max(startPos.col, endPos.col);

        this.deselectAllCells();

        for (let r = minRow; r <= maxRow; r++) {
            const row = this.selectionTable.rows[r];
            if (!row) continue;

            for (let c = minCol; c <= maxCol; c++) {
                const targetCell = row.cells[c];
                if (targetCell && targetCell.getAttribute('contenteditable') === 'true') {
                    this.selectCell(targetCell);
                }
            }
        }
    }

    getCellPosition(cell) {
        const table = cell.closest('table');
        if (!table) return null;

        const row = cell.parentElement;
        const rowIndex = Array.from(table.rows).indexOf(row);
        const colIndex = Array.from(row.cells).indexOf(cell);

        return { row: rowIndex, col: colIndex };
    }

    selectCell(cell) {
        if (!this.selectedCells.includes(cell)) {
            cell.classList.add('cell-selected');
            this.selectedCells.push(cell);
        }
    }

    deselectAllCells() {
        this.selectedCells.forEach(cell => {
            cell.classList.remove('cell-selected');
        });
        this.selectedCells = [];
    }

    selectCellContent(cell) {
        const range = document.createRange();
        range.selectNodeContents(cell);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    applyCommand(command) {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            // 셀 내용 전체 선택
            const range = document.createRange();
            range.selectNodeContents(cell);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // 명령 실행
            document.execCommand(command, false, null);
        });

        this.saveHistory();
    }

    applyFormat(type, value) {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            if (type === 'fontFamily') {
                cell.style.fontFamily = value;
                // 셀 내부 모든 요소에도 적용
                cell.querySelectorAll('*').forEach(el => {
                    el.style.fontFamily = value;
                });
            } else if (type === 'fontSize') {
                cell.style.fontSize = value;
                // 셀 내부 모든 요소에도 적용
                cell.querySelectorAll('*').forEach(el => {
                    el.style.fontSize = value;
                });
            }
        });

        this.saveHistory();
    }

    applyColor(command, color) {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            // 셀 내용 전체 선택
            const range = document.createRange();
            range.selectNodeContents(cell);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // 색상 적용
            if (command === 'backColor') {
                if (!document.execCommand('hiliteColor', false, color)) {
                    document.execCommand('backColor', false, color);
                }
            } else {
                document.execCommand(command, false, color);
            }
        });

        this.saveHistory();
    }

    applyAlign(alignment) {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            cell.style.textAlign = alignment;
        });

        this.saveHistory();
    }

    applyLineHeight(value) {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            cell.style.lineHeight = value;
        });

        this.saveHistory();
    }

    applyParagraphSpacing(value) {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            const paragraphs = cell.querySelectorAll('p');
            if (paragraphs.length > 0) {
                paragraphs.forEach(p => {
                    p.style.marginBottom = value;
                });
            } else {
                cell.style.paddingBottom = value;
            }
        });

        this.saveHistory();
    }

    clearFormat() {
        if (!this.activeCell && this.selectedCells.length === 0) return;

        const targetCells = this.selectedCells.length > 0 ? this.selectedCells : [this.activeCell];

        targetCells.forEach(cell => {
            // 모든 인라인 스타일 제거
            cell.removeAttribute('style');

            // 모든 자식 요소의 스타일도 제거
            cell.querySelectorAll('*').forEach(el => {
                el.removeAttribute('style');
            });

            // 텍스트만 남기고 포맷팅 제거
            const text = cell.textContent;
            cell.innerHTML = text;
        });

        this.saveHistory();
    }

    updateToolbarState() {
        if (!this.activeCell) return;

        const selection = window.getSelection();
        const element = selection.rangeCount > 0
            ? selection.getRangeAt(0).commonAncestorContainer
            : this.activeCell;
        const computedStyle = window.getComputedStyle(
            element.nodeType === Node.TEXT_NODE ? element.parentElement : element
        );

        // 폰트 패밀리 업데이트
        const fontFamilySelect = document.getElementById('font-family');
        if (fontFamilySelect && computedStyle.fontFamily) {
            const fontName = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            const matchingOption = Array.from(fontFamilySelect.options).find(
                option => option.value === fontName
            );
            if (matchingOption) {
                fontFamilySelect.value = fontName;
            }
        }

        // 폰트 크기 업데이트
        const fontSizeSelect = document.getElementById('font-size');
        if (fontSizeSelect && computedStyle.fontSize) {
            const pxSize = parseFloat(computedStyle.fontSize);
            const ptSize = Math.round(pxSize * 0.75) + 'pt';
            const matchingOption = Array.from(fontSizeSelect.options).find(
                option => option.value === ptSize
            );
            if (matchingOption) {
                fontSizeSelect.value = ptSize;
            }
        }

        // 버튼 active 상태 업데이트
        this.updateButtonState('bold-btn', 'bold');
        this.updateButtonState('italic-btn', 'italic');
        this.updateButtonState('underline-btn', 'underline');
        this.updateButtonState('strike-btn', 'strikeThrough');

        // 정렬 버튼 상태
        const textAlign = computedStyle.textAlign;
        ['left', 'center', 'right', 'justify'].forEach(align => {
            const btn = document.getElementById(`align-${align}-btn`);
            if (btn) {
                btn.classList.toggle('active', textAlign === align);
            }
        });
    }

    updateButtonState(buttonId, command) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        try {
            const isActive = document.queryCommandState(command);
            btn.classList.toggle('active', isActive);
        } catch (e) {
            // queryCommandState가 지원되지 않는 경우
            btn.classList.remove('active');
        }
    }

    saveHistory() {
        const editor = document.getElementById('editor');
        if (!editor) return;

        const state = editor.innerHTML;

        // 이전 상태와 동일하면 저장하지 않음
        if (this.editHistory[this.historyIndex] === state) return;

        // 현재 인덱스 이후의 히스토리 삭제
        this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);

        // 새 상태 추가
        this.editHistory.push(state);
        this.historyIndex++;

        // 최대 크기 초과 시 오래된 것 제거
        if (this.editHistory.length > this.maxHistorySize) {
            this.editHistory.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex <= 0) {
            console.log('[CellEditor] 실행 취소할 내용이 없습니다');
            return;
        }

        this.historyIndex--;
        this.restoreHistory();
        console.log('[CellEditor] 실행 취소');
    }

    redo() {
        if (this.historyIndex >= this.editHistory.length - 1) {
            console.log('[CellEditor] 다시 실행할 내용이 없습니다');
            return;
        }

        this.historyIndex++;
        this.restoreHistory();
        console.log('[CellEditor] 다시 실행');
    }

    restoreHistory() {
        const editor = document.getElementById('editor');
        if (!editor || this.historyIndex < 0 || this.historyIndex >= this.editHistory.length) return;

        editor.innerHTML = this.editHistory[this.historyIndex];

        // 셀 이벤트 재설정
        this.setupEditableCells();
    }
}

// 전역 CellEditor 인스턴스
let cellEditor = null;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Contract Editor Enhanced] 시작');

    // 인증 확인
    checkAuth();

    // CellEditor 초기화
    cellEditor = new CellEditor();

    // 기타 기능 설정
    setupActions();
    setupLogout();
    setupTableContextMenu();

    // 초기 히스토리 저장
    cellEditor.saveHistory();

    console.log('[Contract Editor Enhanced] 초기화 완료');
});

// 저장/인쇄 기능
function setupActions() {
    // 저장 버튼
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveDocument();
        });
    }

    // 인쇄 버튼
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
}

// 문서 저장
function saveDocument() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    const content = editor.innerHTML;

    try {
        localStorage.setItem('contract-editor-content', content);
        alert('문서가 저장되었습니다.');
        console.log('[Contract Editor] 문서 저장 완료');
    } catch (e) {
        console.error('[Contract Editor] 저장 오류:', e);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 문서 로드
function loadDocument() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    const savedContent = localStorage.getItem('contract-editor-content');

    if (savedContent) {
        if (confirm('저장된 문서가 있습니다. 불러오시겠습니까?')) {
            editor.innerHTML = savedContent;
            console.log('[Contract Editor] 문서 로드 완료');

            // 셀 이벤트 재설정
            if (cellEditor) {
                cellEditor.setupEditableCells();
            }
        }
    }
}

// 로그아웃 설정
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('adminRole');
                window.location.href = '../pages/login.html';
            }
        });
    }
}

// 인증 확인
function checkAuth() {
    let displayName = null;
    let adminRole = null;

    if (typeof AuthManager !== 'undefined') {
        displayName = AuthManager.getUsername() || AuthManager.getUserId();
        adminRole = AuthManager.getUserPermissions()?.role || localStorage.getItem('adminRole');
    } else {
        displayName = localStorage.getItem('username') || localStorage.getItem('userId');
        adminRole = localStorage.getItem('adminRole');
    }

    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        const roleMap = {
            '0': '(최고관리자)',
            '1': '(관리자_1)',
            '2': '(관리자_2)',
            '3': '(본부장)',
            '4': '(사업부장)',
            '5': '(일반위원)'
        };
        const roleText = adminRole && roleMap[adminRole] ? ` ${roleMap[adminRole]}` : '';
        usernameDisplay.textContent = `${displayName || '비로그인 사용자'}${roleText}`;
    }
}

// 테이블 컨텍스트 메뉴 (간단 버전)
function setupTableContextMenu() {
    // 기존 컨텍스트 메뉴 코드 유지
    console.log('[Contract Editor] 컨텍스트 메뉴 설정');
}

// 페이지 로드 시 저장된 문서 확인
window.addEventListener('load', function() {
    loadDocument();
});
