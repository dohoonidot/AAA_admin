// 매출/매입계약 기안서 에디터 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    checkAuth();
    
    // 에디터 초기화
    initEditor();
    
    // 툴바 이벤트 리스너
    setupToolbar();
    
    // 저장/인쇄 기능
    setupActions();
    
    // 로그아웃 버튼
    setupLogout();
    
    // 테이블 컨텍스트 메뉴 설정
    setupTableContextMenu();
    
    // 테이블 드래그 및 리사이즈 설정
    setupTableDragAndResize();

    // 초기 spellcheck 비활성화
    const editor = document.getElementById('editor');
    applySpellcheckSettings(editor || document);
});

// 에디터 초기화
function initEditor() {
    const editor = document.getElementById('editor');
    if (editor) {
        editor.setAttribute('spellcheck', 'false');
        editor.setAttribute('data-gramm', 'false');
        editor.setAttribute('data-gramm_editor', 'false');
        editor.setAttribute('data-enable-grammarly', 'false');
        editor.setAttribute('autocorrect', 'off');
        editor.setAttribute('autocomplete', 'off');
        editor.setAttribute('autocapitalize', 'off');
    }

    // 모든 contenteditable 요소에 스펠체크 비활성화 적용
    applySpellcheckSettings(editor);

    // 에디터 포커스 이벤트
    editor.addEventListener('focus', function() {
        updateToolbarState();
    });

    // 에디터 선택 변경 이벤트
    editor.addEventListener('selectionchange', function() {
        updateToolbarState();
    });

    // 키보드 이벤트로 선택 변경 감지 (워드처럼 커서 이동 시 폰트 감지)
    editor.addEventListener('keyup', function(e) {
        // 화살표 키, Home, End 등 커서 이동 키에서도 폰트 감지
        updateToolbarState();
    });
    
    // 키보드 입력 시에도 폰트 감지 (커서 위치 변경)
    editor.addEventListener('keydown', function(e) {
        // 화살표 키, Home, End, PageUp, PageDown 등 커서 이동 키
        const cursorKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
        if (cursorKeys.includes(e.key)) {
            // 약간의 지연 후 폰트 감지 (커서 이동 완료 후)
            setTimeout(() => {
                updateToolbarState();
            }, 10);
        }
    });

    editor.addEventListener('mouseup', function(e) {
        // 텍스트 선택 유지 (워드처럼 동작)
        // 툴바 클릭 시에도 선택이 유지되도록 함
        updateToolbarState();
    });

    // 텍스트 선택 변경 감지 (워드처럼 선택 유지 및 폰트 감지)
    document.addEventListener('selectionchange', function() {
        const selection = window.getSelection();
        // 커서 위치 변경 시에도 폰트 감지 (워드처럼 동작)
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const editor = document.getElementById('editor');
            if (editor && editor.contains(range.commonAncestorContainer)) {
                // 커서만 있어도 폰트 감지 (워드처럼)
                updateToolbarState();
            }
        }
    });

    // 표 내부 셀 편집 시 포맷팅 유지
    const tableCells = editor.querySelectorAll('td[contenteditable="true"]');
    tableCells.forEach(cell => {
        cell.addEventListener('focus', function() {
            updateToolbarState();
        });

        cell.addEventListener('input', function() {
            // 입력 시 포맷팅 유지
        });
    });

    // 모든 contenteditable 요소에 포커스/선택 이벤트 추가
    const editableElements = editor.querySelectorAll('[contenteditable="true"]');
    editableElements.forEach(element => {
        element.addEventListener('focus', function() {
            updateToolbarState();
        });

        element.addEventListener('click', function() {
            updateToolbarState();
        });

        element.addEventListener('input', function() {
            // 동적으로 추가된 요소에도 스펠체크 비활성화 적용
            applySpellcheckSettings(this);
        });
    });
}

// 툴바 설정
function setupToolbar() {
    const applyCommand = (command, value = null) => {
        // 선택된 셀이 있으면 각 셀에 서식 적용 (워드처럼 동작)
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                // 각 셀 내부의 텍스트에 서식 적용
                const range = document.createRange();
                
                // 셀이 비어있으면 빈 텍스트 노드 생성
                if (cell.childNodes.length === 0 || (cell.childNodes.length === 1 && cell.childNodes[0].nodeType === Node.TEXT_NODE && cell.textContent.trim() === '')) {
                    const textNode = document.createTextNode('\u200B'); // Zero-width space
                    cell.appendChild(textNode);
                }
                
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                try {
                    document.execCommand('styleWithCSS', false, true);
                } catch (error) {
                    // 일부 브라우저는 styleWithCSS를 지원하지 않음
                }
                
                // 명령 실행
                const result = document.execCommand(command, false, value);
                
                // Zero-width space 제거 (있는 경우)
                if (cell.firstChild && cell.firstChild.nodeType === Node.TEXT_NODE && cell.firstChild.textContent === '\u200B') {
                    cell.removeChild(cell.firstChild);
                }
            });
            // 선택 복원 (셀 선택 유지)
            updateToolbarState();
            return;
        }
        
        // 일반 텍스트 선택에 서식 적용
        try {
            document.execCommand('styleWithCSS', false, true);
        } catch (error) {
            // 일부 브라우저는 styleWithCSS를 지원하지 않음
        }
        document.execCommand(command, false, value);
        updateToolbarState();
    };

    document.getElementById('undo-btn').addEventListener('click', function() {
        document.execCommand('undo', false, null);
    });

    document.getElementById('redo-btn').addEventListener('click', function() {
        document.execCommand('redo', false, null);
    });

    // 폰트 변경
    document.getElementById('font-family').addEventListener('change', function() {
        applyFormat('fontName', this.value);
    });
    
    // 폰트 크기 변경
    document.getElementById('font-size').addEventListener('change', function() {
        applyFormat('fontSize', this.value);
    });
    
    // 굵게
    document.getElementById('bold-btn').addEventListener('click', function() {
        applyCommand('bold');
    });

    // 기울임
    document.getElementById('italic-btn').addEventListener('click', function() {
        applyCommand('italic');
    });

    // 밑줄
    document.getElementById('underline-btn').addEventListener('click', function() {
        applyCommand('underline');
    });
    
    document.getElementById('strike-btn').addEventListener('click', function() {
        applyCommand('strikeThrough');
    });

    // 위첨자
    document.getElementById('superscript-btn').addEventListener('click', function() {
        applyCommand('superscript');
    });

    // 아래첨자
    document.getElementById('subscript-btn').addEventListener('click', function() {
        applyCommand('subscript');
    });

    const textColorInput = document.getElementById('text-color-input');
    textColorInput.addEventListener('input', function(e) {
        // 선택된 셀이 있으면 각 셀에 색상 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                const range = document.createRange();
                
                // 셀이 비어있으면 빈 텍스트 노드 생성
                if (cell.childNodes.length === 0 || (cell.childNodes.length === 1 && cell.childNodes[0].nodeType === Node.TEXT_NODE && cell.textContent.trim() === '')) {
                    const textNode = document.createTextNode('\u200B');
                    cell.appendChild(textNode);
                }
                
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                applyCommand('foreColor', e.target.value);
                
                // Zero-width space 제거
                if (cell.firstChild && cell.firstChild.nodeType === Node.TEXT_NODE && cell.firstChild.textContent === '\u200B') {
                    cell.removeChild(cell.firstChild);
                }
            });
        } else {
            applyCommand('foreColor', e.target.value);
        }
    });
    
    const highlightColorInput = document.getElementById('highlight-color-input');
    highlightColorInput.addEventListener('input', function(e) {
        const color = e.target.value;
        // 선택된 셀이 있으면 각 셀에 배경색 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                const range = document.createRange();
                
                // 셀이 비어있으면 빈 텍스트 노드 생성
                if (cell.childNodes.length === 0 || (cell.childNodes.length === 1 && cell.childNodes[0].nodeType === Node.TEXT_NODE && cell.textContent.trim() === '')) {
                    const textNode = document.createTextNode('\u200B');
                    cell.appendChild(textNode);
                }
                
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                if (!document.execCommand('hiliteColor', false, color)) {
                    document.execCommand('backColor', false, color);
                }
                
                // Zero-width space 제거
                if (cell.firstChild && cell.firstChild.nodeType === Node.TEXT_NODE && cell.firstChild.textContent === '\u200B') {
                    cell.removeChild(cell.firstChild);
                }
            });
        } else {
            if (!document.execCommand('hiliteColor', false, color)) {
                document.execCommand('backColor', false, color);
            }
        }
        updateToolbarState();
    });

    document.getElementById('clear-format-btn').addEventListener('click', function() {
        // 선택된 셀이 있으면 각 셀에 서식 지우기 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                const range = document.createRange();
                range.selectNodeContents(cell);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('removeFormat', false, null);
                // 인라인 스타일도 제거
                const textNodes = getTextNodesIn(cell);
                textNodes.forEach(node => {
                    if (node.parentElement) {
                        node.parentElement.style.fontWeight = '';
                        node.parentElement.style.fontStyle = '';
                        node.parentElement.style.textDecoration = '';
                        node.parentElement.style.color = '';
                        node.parentElement.style.backgroundColor = '';
                    }
                });
            });
        } else {
            document.execCommand('removeFormat', false, null);
        }
        updateToolbarState();
    });
    
    // 왼쪽 정렬
    document.getElementById('align-left-btn').addEventListener('click', function() {
        // 선택된 셀이 있으면 각 셀에 정렬 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                cell.style.textAlign = 'left';
            });
        } else {
            document.execCommand('justifyLeft', false, null);
        }
        updateToolbarState();
    });
    
    // 가운데 정렬
    document.getElementById('align-center-btn').addEventListener('click', function() {
        // 선택된 셀이 있으면 각 셀에 정렬 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                cell.style.textAlign = 'center';
            });
        } else {
            document.execCommand('justifyCenter', false, null);
        }
        updateToolbarState();
    });
    
    // 오른쪽 정렬
    document.getElementById('align-right-btn').addEventListener('click', function() {
        // 선택된 셀이 있으면 각 셀에 정렬 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                cell.style.textAlign = 'right';
            });
        } else {
            document.execCommand('justifyRight', false, null);
        }
        updateToolbarState();
    });
    
    // 양쪽 정렬
    document.getElementById('align-justify-btn').addEventListener('click', function() {
        // 선택된 셀이 있으면 각 셀에 정렬 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                cell.style.textAlign = 'justify';
            });
        } else {
            document.execCommand('justifyFull', false, null);
        }
        updateToolbarState();
    });
    
    document.getElementById('bullet-list-btn').addEventListener('click', function() {
        applyCommand('insertUnorderedList');
    });
    
    document.getElementById('number-list-btn').addEventListener('click', function() {
        applyCommand('insertOrderedList');
    });
    
    document.getElementById('indent-btn').addEventListener('click', function() {
        applyCommand('indent');
    });
    
    document.getElementById('outdent-btn').addEventListener('click', function() {
        applyCommand('outdent');
    });

    // 줄 간격
    document.getElementById('line-height-select').addEventListener('change', function() {
        const lineHeight = this.value;
        // 선택된 셀이 있으면 각 셀에 줄 간격 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                cell.style.lineHeight = lineHeight;
                // 셀 내부의 모든 요소에도 적용
                const allElements = cell.querySelectorAll('*');
                allElements.forEach(el => {
                    el.style.lineHeight = lineHeight;
                });
            });
        } else {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const element = container.nodeType === 3 ? container.parentElement : container;
                if (element) {
                    element.style.lineHeight = lineHeight;
                }
            }
        }
        updateToolbarState();
    });

    // 단락 간격
    document.getElementById('paragraph-spacing-select').addEventListener('change', function() {
        const spacing = this.value;
        // 선택된 셀이 있으면 각 셀에 단락 간격 적용
        if (selectedCellElements.length > 0) {
            selectedCellElements.forEach(cell => {
                // 셀 내부의 모든 단락 요소에 적용
                const paragraphs = cell.querySelectorAll('p');
                if (paragraphs.length > 0) {
                    paragraphs.forEach(p => {
                        p.style.marginBottom = spacing;
                    });
                } else {
                    // 단락이 없으면 셀 자체에 적용
                    cell.style.paddingBottom = spacing;
                }
            });
        } else {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const element = container.nodeType === 3 ? container.parentElement : container;
                if (element) {
                    element.style.marginBottom = spacing;
                }
            }
        }
        updateToolbarState();
    });
    
    // 키보드 단축키
    document.addEventListener('keydown', function(e) {
        // Ctrl+B: 굵게
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold', false, null);
            updateToolbarState();
        }
        // Ctrl+I: 기울임
        else if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic', false, null);
            updateToolbarState();
        }
        // Ctrl+U: 밑줄
        else if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            document.execCommand('underline', false, null);
            updateToolbarState();
        }
        // Ctrl+Shift+S: 취소선
        else if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            document.execCommand('strikeThrough', false, null);
            updateToolbarState();
        }
        // Ctrl + ] : 들여쓰기
        else if (e.ctrlKey && e.key === ']') {
            e.preventDefault();
            applyCommand('indent');
        }
        // Ctrl + [ : 내어쓰기
        else if (e.ctrlKey && e.key === '[') {
            e.preventDefault();
            applyCommand('outdent');
        }
        // Ctrl+F: 찾기
        else if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            showFindReplaceDialog();
        }
    });
}

// 포맷 적용
function applyFormat(command, value) {
    const editor = document.getElementById('editor');
    const selection = window.getSelection();

    // 선택된 셀이 있으면 각 셀에 서식 적용 (워드처럼 동작)
    if (selectedCellElements.length > 0) {
        selectedCellElements.forEach(cell => {
            // 각 셀 내부의 텍스트에 서식 적용
            const range = document.createRange();

            // 셀이 비어있으면 빈 텍스트 노드 생성
            if (cell.childNodes.length === 0 || (cell.childNodes.length === 1 && cell.childNodes[0].nodeType === Node.TEXT_NODE && cell.textContent.trim() === '')) {
                const textNode = document.createTextNode('\u200B'); // Zero-width space
                cell.appendChild(textNode);
            }

            range.selectNodeContents(cell);
            selection.removeAllRanges();
            selection.addRange(range);

            if (command === 'fontName') {
                document.execCommand('fontName', false, value);
                // 셀 자체에도 폰트 패밀리 적용
                cell.style.fontFamily = value;
            } else if (command === 'fontSize') {
                const size = parseInt(value);
                document.execCommand('fontSize', false, size);
                // 셀 자체에도 폰트 크기 적용
                cell.style.fontSize = value;
                // 셀 내부의 모든 요소에도 폰트 크기 적용
                const allElements = cell.querySelectorAll('*');
                allElements.forEach(el => {
                    el.style.fontSize = value;
                });
            }

            // Zero-width space 제거 (있는 경우)
            if (cell.firstChild && cell.firstChild.nodeType === Node.TEXT_NODE && cell.firstChild.textContent === '\u200B') {
                cell.removeChild(cell.firstChild);
            }
        });
        updateToolbarState();
        return;
    }

    if (selection.rangeCount === 0) {
        // 선택된 텍스트가 없으면 현재 포커스된 요소에 적용
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.contentEditable === 'true' || activeElement.getAttribute('contenteditable') === 'true')) {
            if (command === 'fontName') {
                activeElement.style.fontFamily = value;
                // 자식 요소에도 적용
                const allChildren = activeElement.querySelectorAll('*');
                allChildren.forEach(child => {
                    child.style.fontFamily = value;
                });
            } else if (command === 'fontSize') {
                activeElement.style.fontSize = value;
                // 자식 요소에도 적용
                const allChildren = activeElement.querySelectorAll('*');
                allChildren.forEach(child => {
                    child.style.fontSize = value;
                });
            }
        }
        return;
    }

    const range = selection.getRangeAt(0);

    if (command === 'fontName') {
        document.execCommand('fontName', false, value);
        // 선택된 범위의 부모 요소에도 적용
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        if (element) {
            element.style.fontFamily = value;
        }
    } else if (command === 'fontSize') {
        // fontSize는 숫자만 받으므로 변환 필요
        const size = parseInt(value);
        document.execCommand('fontSize', false, size);

        // 선택된 요소들의 폰트 크기 직접 설정
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        if (element) {
            element.style.fontSize = value;
        }
    }

    updateToolbarState();
}

// 폰트 선택 드롭다운 업데이트 (워드처럼 커서 위치의 폰트 감지)
function updateFontSelects(computedStyle) {
    // 폰트 패밀리 업데이트 (워드처럼 정확한 폰트 감지)
    const fontFamily = computedStyle.fontFamily;
    const fontFamilySelect = document.getElementById('font-family');
    if (fontFamily && fontFamilySelect) {
        // 폰트 이름 추출 (첫 번째 폰트, 따옴표 제거)
        const fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        
        // 드롭다운에 해당 폰트가 있는지 확인
        const option = fontFamilySelect.querySelector(`option[value="${fontName}"]`);
        if (option) {
            fontFamilySelect.value = fontName;
        } else {
            // 정확히 일치하지 않으면 부분 일치 검색
            const options = fontFamilySelect.querySelectorAll('option');
            for (let opt of options) {
                if (fontName.toLowerCase().includes(opt.value.toLowerCase()) || 
                    opt.value.toLowerCase().includes(fontName.toLowerCase())) {
                    fontFamilySelect.value = opt.value;
                    break;
                }
            }
        }
    }
    
    // 폰트 크기 업데이트 (워드처럼 정확한 크기 감지)
    const fontSize = computedStyle.fontSize;
    const fontSizeSelect = document.getElementById('font-size');
    if (fontSize && fontSizeSelect) {
        // px를 pt로 변환 (1px ≈ 0.75pt, 정확히는 96dpi 기준)
        const pxValue = parseFloat(fontSize);
        const ptValue = Math.round(pxValue * 0.75);
        const sizeStr = ptValue + 'pt';
        
        // 드롭다운에 해당 크기가 있는지 확인
        const option = fontSizeSelect.querySelector(`option[value="${sizeStr}"]`);
        if (option) {
            fontSizeSelect.value = sizeStr;
        } else {
            // 가장 가까운 크기 찾기
            const options = Array.from(fontSizeSelect.querySelectorAll('option'));
            let closestOption = null;
            let minDiff = Infinity;
            
            options.forEach(opt => {
                const optPt = parseFloat(opt.value);
                if (!isNaN(optPt)) {
                    const diff = Math.abs(optPt - ptValue);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestOption = opt;
                    }
                }
            });
            
            if (closestOption && minDiff < 2) { // 2pt 이내 차이면 선택
                fontSizeSelect.value = closestOption.value;
            }
        }
    }
}

// 툴바 상태 업데이트
function updateToolbarState() {
    const editor = document.getElementById('editor');
    
    // 현재 선택 영역 확인
    const selection = window.getSelection();
    
    // 선택이 없어도 activeElement의 폰트 감지 (워드처럼 동작)
    if (selection.rangeCount === 0) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body) {
            const computedStyle = window.getComputedStyle(activeElement);
            updateFontSelects(computedStyle);
        }
        return;
    }
    
    // 커서 위치의 실제 텍스트 노드 찾기 (워드처럼 정확한 폰트 감지)
    let targetElement = null;
    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
        // 커서만 있는 경우: 커서 위치의 텍스트 노드 찾기
        let node = range.startContainer;
        
        // 텍스트 노드가 아니면 부모 요소로 이동
        if (node.nodeType === Node.TEXT_NODE) {
            targetElement = node.parentElement;
        } else {
            targetElement = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        }
        
        // 커서 위치의 실제 스타일을 가진 요소 찾기 (인라인 스타일 우선)
        let current = targetElement;
        while (current && current !== editor) {
            // 인라인 스타일이 있거나 폰트 관련 스타일이 있는 요소 찾기
            if (current.style && (current.style.fontFamily || current.style.fontSize)) {
                targetElement = current;
                break;
            }
            current = current.parentElement;
        }
    } else {
        // 텍스트가 선택된 경우: 선택된 텍스트의 부모 요소
        const container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            targetElement = container.parentElement;
        } else {
            targetElement = container;
        }
    }
    
    // 활성 요소 확인 (fallback)
    if (!targetElement) {
        let activeElement = document.activeElement;
        if (!activeElement || activeElement === document.body) {
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                activeElement = range.commonAncestorContainer;
                if (activeElement.nodeType === Node.TEXT_NODE) {
                    activeElement = activeElement.parentElement;
                }
            }
        }
        targetElement = activeElement;
    }
    
    if (!targetElement) return;
    
    // 커서 위치의 실제 computed style 가져오기
    const computedStyle = window.getComputedStyle(targetElement);
    
    // 폰트 선택 드롭다운 업데이트
    updateFontSelects(computedStyle);
    
    // 포맷 버튼 상태 업데이트
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const underlineBtn = document.getElementById('underline-btn');
    const strikeBtn = document.getElementById('strike-btn');
    const bulletBtn = document.getElementById('bullet-list-btn');
    const numberBtn = document.getElementById('number-list-btn');
    
    // document.queryCommandState는 deprecated이지만 호환성을 위해 사용
    try {
        if (document.queryCommandState('bold')) {
            boldBtn.classList.add('active');
        } else {
            boldBtn.classList.remove('active');
        }
        
        if (document.queryCommandState('italic')) {
            italicBtn.classList.add('active');
        } else {
            italicBtn.classList.remove('active');
        }
        
        if (document.queryCommandState('underline')) {
            underlineBtn.classList.add('active');
        } else {
            underlineBtn.classList.remove('active');
        }
        
        if (document.queryCommandState('strikeThrough')) {
            strikeBtn.classList.add('active');
        } else {
            strikeBtn.classList.remove('active');
        }
        
        if (document.queryCommandState('insertUnorderedList')) {
            bulletBtn.classList.add('active');
        } else {
            bulletBtn.classList.remove('active');
        }
        
        if (document.queryCommandState('insertOrderedList')) {
            numberBtn.classList.add('active');
        } else {
            numberBtn.classList.remove('active');
        }
    } catch (e) {
        // queryCommandState가 지원되지 않는 경우 스타일로 확인
        const style = window.getComputedStyle(activeElement);
        if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
            boldBtn.classList.add('active');
        } else {
            boldBtn.classList.remove('active');
        }
        
        if (style.fontStyle === 'italic') {
            italicBtn.classList.add('active');
        } else {
            italicBtn.classList.remove('active');
        }
        
        if (style.textDecoration.includes('underline')) {
            underlineBtn.classList.add('active');
        } else {
            underlineBtn.classList.remove('active');
        }
        
        if (style.textDecoration.includes('line-through')) {
            strikeBtn.classList.add('active');
        } else {
            strikeBtn.classList.remove('active');
        }
    }
    
    // 정렬 버튼 상태 업데이트
    const alignLeftBtn = document.getElementById('align-left-btn');
    const alignCenterBtn = document.getElementById('align-center-btn');
    const alignRightBtn = document.getElementById('align-right-btn');
    const alignJustifyBtn = document.getElementById('align-justify-btn');
    
    const textAlign = window.getComputedStyle(activeElement).textAlign;
    alignLeftBtn.classList.remove('active');
    alignCenterBtn.classList.remove('active');
    alignRightBtn.classList.remove('active');
    alignJustifyBtn.classList.remove('active');
    
    if (textAlign === 'left') {
        alignLeftBtn.classList.add('active');
    } else if (textAlign === 'center') {
        alignCenterBtn.classList.add('active');
    } else if (textAlign === 'right') {
        alignRightBtn.classList.add('active');
    } else if (textAlign === 'justify') {
        alignJustifyBtn.classList.add('active');
    }

    // 색상 선택기 업데이트
    updateColorPicker('text-color-input', window.getComputedStyle(activeElement).color);
    updateColorPicker('highlight-color-input', window.getComputedStyle(activeElement).backgroundColor);
}

// 저장/인쇄 기능
function setupActions() {
    // 저장 버튼
    document.getElementById('save-btn').addEventListener('click', function() {
        saveDocument();
    });
    
    // 인쇄 버튼
    document.getElementById('print-btn').addEventListener('click', function() {
        window.print();
    });
    
    // 표 삽입 버튼
    document.getElementById('insert-table-btn').addEventListener('click', function() {
        showTableInsertDialog();
    });
    
    // 이미지 삽입 버튼
    document.getElementById('insert-image-btn').addEventListener('click', function() {
        insertImage();
    });

    // 이미지 파일 업로드 버튼
    document.getElementById('insert-image-file-btn').addEventListener('click', function() {
        insertImageFromFile();
    });
    
    // 링크 삽입 버튼
    document.getElementById('insert-link-btn').addEventListener('click', function() {
        insertLink();
    });

    // 링크 제거 버튼
    document.getElementById('remove-link-btn').addEventListener('click', function() {
        removeLink();
    });
    
    // 구분선 삽입 버튼
    document.getElementById('insert-hr-btn').addEventListener('click', function() {
        insertHorizontalRule();
    });

    // 특수 문자 삽입 버튼
    document.getElementById('insert-special-char-btn').addEventListener('click', function() {
        insertSpecialCharacter();
    });

    // 날짜 삽입 버튼
    document.getElementById('insert-date-btn').addEventListener('click', function() {
        insertDate();
    });

    // 페이지 나누기 버튼
    document.getElementById('insert-page-break-btn').addEventListener('click', function() {
        insertPageBreak();
    });

    // 찾기/바꾸기 버튼
    document.getElementById('find-replace-btn').addEventListener('click', function() {
        showFindReplaceDialog();
    });

    // 전체 선택 버튼
    document.getElementById('select-all-btn').addEventListener('click', function() {
        document.execCommand('selectAll', false, null);
    });
}

// 문서 저장
function saveDocument() {
    const editor = document.getElementById('editor');
    const content = editor.innerHTML;
    
    // 로컬 스토리지에 저장
    try {
        localStorage.setItem('contract-editor-content', content);
        alert('문서가 저장되었습니다.');
    } catch (e) {
        console.error('저장 오류:', e);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 문서 로드
function loadDocument() {
    const editor = document.getElementById('editor');
    const savedContent = localStorage.getItem('contract-editor-content');
    
    if (savedContent) {
        if (confirm('저장된 문서가 있습니다. 불러오시겠습니까?')) {
            editor.innerHTML = savedContent;
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

// 페이지 로드 시 저장된 문서 확인
window.addEventListener('load', function() {
    loadDocument();
});

// 색상 값을 헥사 형태로 변환
function rgbToHex(color) {
    if (!color) return null;
    if (color.startsWith('#')) return color;
    
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!rgbMatch) return null;
    
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    
    const toHex = (value) => {
        const hex = value.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function updateColorPicker(elementId, color) {
    const input = document.getElementById(elementId);
    if (!input) return;
    
    const hexColor = rgbToHex(color) || (elementId === 'highlight-color-input' ? '#fffacd' : '#1a1f36');
    input.value = hexColor;
}

// 테이블 컨텍스트 메뉴 설정
let currentCell = null;
let contextMenu = null;
let lastHighlightedCell = null;

function setupTableContextMenu() {
    const editor = document.getElementById('editor');
    
    // 컨텍스트 메뉴 생성
    contextMenu = document.createElement('div');
    contextMenu.id = 'table-context-menu';
    contextMenu.className = 'table-context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" data-action="select-table">표 전체 선택</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="insert-row-above">행 추가 (위)</div>
        <div class="context-menu-item" data-action="insert-row-below">행 추가 (아래)</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="insert-col-left">열 추가 (왼쪽)</div>
        <div class="context-menu-item" data-action="insert-col-right">열 추가 (오른쪽)</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="delete-row">행 삭제</div>
        <div class="context-menu-item" data-action="delete-col">열 삭제</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="merge-cells">셀 병합</div>
        <div class="context-menu-item" data-action="split-cell">셀 분할</div>
    `;
    document.body.appendChild(contextMenu);
    
    // 테이블 셀에 우클릭 이벤트 추가
    editor.addEventListener('contextmenu', function(e) {
        const cell = e.target.closest('td, th');
        if (cell && cell.closest('table')) {
            e.preventDefault();
            currentCell = cell;
            highlightContextCell(cell);
            showContextMenu(e.pageX, e.pageY);
        } else {
            hideContextMenu();
        }
    });
    
    // 좌클릭 시 셀 강조
    editor.addEventListener('click', function(e) {
        const cell = e.target.closest('td, th');
        if (cell && cell.closest('table')) {
            highlightContextCell(cell);
        } else if (!e.target.closest('.table-handle')) {
            removeContextCellHighlight();
        }
    });
    
    // 메뉴 항목 클릭 이벤트
    contextMenu.addEventListener('click', function(e) {
        const action = e.target.getAttribute('data-action');
        if (action && currentCell) {
            executeTableAction(action, currentCell);
            hideContextMenu();
        }
    });
    
    // 다른 곳 클릭 시 메뉴 숨기기
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // ESC 키로 메뉴 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideContextMenu();
        }
    });
}

function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    
    // 화면 밖으로 나가지 않도록 조정
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = (y - rect.height) + 'px';
    }
}

function hideContextMenu() {
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
    currentCell = null;
    removeContextCellHighlight();
}

function executeTableAction(action, cell) {
    const table = cell.closest('table');
    if (!table) return;
    
    const row = cell.parentElement;
    const rowIndex = Array.from(row.parentElement.children).indexOf(row);
    const colIndex = Array.from(row.children).indexOf(cell);
    
    switch (action) {
        case 'select-table':
            selectEntireTable(table);
            break;
        case 'insert-row-above':
            insertRow(table, rowIndex);
            break;
        case 'insert-row-below':
            insertRow(table, rowIndex + 1);
            break;
        case 'insert-col-left':
            insertColumn(table, colIndex);
            break;
        case 'insert-col-right':
            insertColumn(table, colIndex + 1);
            break;
        case 'delete-row':
            if (row.parentElement.children.length > 1) {
                row.remove();
            } else {
                alert('최소 1개의 행이 필요합니다.');
            }
            break;
        case 'delete-col':
            if (row.children.length > 1) {
                deleteColumn(table, colIndex);
            } else {
                alert('최소 1개의 열이 필요합니다.');
            }
            break;
        case 'merge-cells':
            alert('셀 병합 기능은 선택된 셀들이 있어야 합니다.');
            break;
        case 'split-cell':
            if (cell.colSpan > 1 || cell.rowSpan > 1) {
                splitCell(cell);
            } else {
                alert('병합된 셀만 분할할 수 있습니다.');
            }
            break;
    }
    
    removeContextCellHighlight();
    clearCellSelection();
}

function insertRow(table, index) {
    const tbody = table.querySelector('tbody') || table;
    const row = tbody.querySelector('tr');
    if (!row) return;
    
    const newRow = row.cloneNode(true);
    // 셀 내용 초기화
    newRow.querySelectorAll('td, th').forEach(cell => {
        cell.innerHTML = '';
        cell.textContent = '';
        cell.contentEditable = 'true';
        // 병합 속성 초기화
        cell.removeAttribute('colspan');
        cell.removeAttribute('rowspan');
    });
    
    if (index >= tbody.children.length) {
        tbody.appendChild(newRow);
    } else {
        tbody.insertBefore(newRow, tbody.children[index]);
    }
}

function insertColumn(table, index) {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = Array.from(row.children);
        const cellToClone = cells[index] || cells[cells.length - 1];
        const newCell = cellToClone.cloneNode(true);
        
        // 셀 내용 초기화
        newCell.innerHTML = '';
        newCell.textContent = '';
        newCell.contentEditable = 'true';
        // 병합 속성 초기화
        newCell.removeAttribute('colspan');
        newCell.removeAttribute('rowspan');
        
        if (index >= cells.length) {
            row.appendChild(newCell);
        } else {
            row.insertBefore(newCell, cells[index]);
        }
    });
}

function deleteColumn(table, colIndex) {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = Array.from(row.children);
        if (cells[colIndex]) {
            cells[colIndex].remove();
        }
    });
}

function splitCell(cell) {
    const colSpan = cell.colSpan || 1;
    const rowSpan = cell.rowSpan || 1;
    const content = cell.innerHTML;
    
    if (colSpan > 1) {
        cell.colSpan = 1;
        for (let i = 1; i < colSpan; i++) {
            const newCell = cell.cloneNode(true);
            newCell.innerHTML = '';
            cell.parentElement.insertBefore(newCell, cell.nextSibling);
        }
    }
    
    if (rowSpan > 1) {
        cell.rowSpan = 1;
        const row = cell.parentElement;
        const rowIndex = Array.from(row.parentElement.children).indexOf(row);
        const colIndex = Array.from(row.children).indexOf(cell);
        
        for (let i = 1; i < rowSpan; i++) {
            const targetRow = row.parentElement.children[rowIndex + i];
            if (targetRow) {
                const newCell = cell.cloneNode(true);
                newCell.innerHTML = '';
                const cells = Array.from(targetRow.children);
                if (cells[colIndex]) {
                    targetRow.insertBefore(newCell, cells[colIndex]);
                } else {
                    targetRow.appendChild(newCell);
                }
            }
        }
    }
}

// 표 삽입 다이얼로그
function showTableInsertDialog() {
    const rows = prompt('행 수를 입력하세요 (1-20):', '3');
    const cols = prompt('열 수를 입력하세요 (1-20):', '3');
    
    if (rows && cols) {
        const rowCount = parseInt(rows);
        const colCount = parseInt(cols);
        
        if (rowCount > 0 && rowCount <= 20 && colCount > 0 && colCount <= 20) {
            insertTable(rowCount, colCount);
        } else {
            alert('행과 열은 1-20 사이의 숫자여야 합니다.');
        }
    }
}

// 표 삽입
function insertTable(rows, cols) {
    const editor = document.getElementById('editor');
    const selection = window.getSelection();
    
    // 에디터 끝에 삽입하기 위한 range 생성
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false); // 끝으로 이동
    
    // 표 앞에 줄바꿈 추가
    const brBefore = document.createElement('br');
    range.insertNode(brBefore);
    range.setStartAfter(brBefore);
    
    // 표 생성
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.margin = '20px 0';
    table.style.border = '1px solid #E9ECEF';
    
    for (let i = 0; i < rows; i++) {
        const tr = document.createElement('tr');
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement(i === 0 ? 'th' : 'td');
            cell.style.padding = '8px';
            cell.style.border = '1px solid #E9ECEF';
            cell.contentEditable = 'true';
            if (i === 0) {
                cell.style.backgroundColor = '#F8F9FA';
                cell.style.fontWeight = 'bold';
                cell.style.textAlign = 'center';
            }
            tr.appendChild(cell);
        }
        table.appendChild(tr);
    }
    
    // 표를 wrapper로 감싸기
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';
    wrapper.appendChild(table);
    
    // wrapper 삽입
    range.insertNode(wrapper);
    
    // 새로 삽입된 표의 spellcheck 비활성화
    applySpellcheckSettings(table);
    
    // wrapper 뒤에 줄바꿈 추가
    const brAfter = document.createElement('br');
    range.setStartAfter(wrapper);
    range.insertNode(brAfter);
    
    // 첫 번째 셀에 포커스
    const firstCell = table.querySelector('th, td');
    if (firstCell) {
        const newRange = document.createRange();
        newRange.selectNodeContents(firstCell);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
    
    // 표 선택 및 핸들 표시
    setTimeout(() => {
        selectTable(table);
    }, 100);
    
    // 스크롤을 삽입된 위치로 이동
    table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 이미지 삽입
function insertImage() {
    const url = prompt('이미지 URL을 입력하세요:', '');
    if (url) {
        const editor = document.getElementById('editor');
        const selection = window.getSelection();
        
        // 에디터 끝에 삽입하기 위한 range 생성
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false); // 끝으로 이동
        
        // 이미지 앞에 줄바꿈 추가
        const brBefore = document.createElement('br');
        range.insertNode(brBefore);
        range.setStartAfter(brBefore);
        
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px 0';
        
        range.insertNode(img);
        
        // 이미지 뒤에 줄바꿈 추가
        const brAfter = document.createElement('br');
        range.setStartAfter(img);
        range.insertNode(brAfter);
        
        // 이미지 선택
        const newRange = document.createRange();
        newRange.selectNode(img);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // 스크롤을 삽입된 위치로 이동
        img.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 하이퍼링크 삽입
function insertLink() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (!text) {
        alert('링크를 삽입할 텍스트를 먼저 선택하세요.');
        return;
    }
    
    const url = prompt('링크 URL을 입력하세요:', 'https://');
    if (url) {
        const range = selection.getRangeAt(0);
        const link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        link.target = '_blank';
        link.style.color = '#007bff';
        link.style.textDecoration = 'underline';
        
        range.deleteContents();
        range.insertNode(link);
        
        // 링크 선택
        const newRange = document.createRange();
        newRange.selectNode(link);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}

// 구분선 삽입
function insertHorizontalRule() {
    const editor = document.getElementById('editor');
    const selection = window.getSelection();
    
    // 에디터 끝에 삽입하기 위한 range 생성
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false); // 끝으로 이동
    
    // 구분선 앞에 줄바꿈 추가
    const brBefore = document.createElement('br');
    range.insertNode(brBefore);
    range.setStartAfter(brBefore);
    
    const hr = document.createElement('hr');
    hr.style.border = '1px solid #E9ECEF';
    hr.style.margin = '20px 0';
    range.insertNode(hr);
    
    // 구분선 뒤에 줄바꿈 추가
    const brAfter = document.createElement('br');
    range.setStartAfter(hr);
    range.insertNode(brAfter);
    
    // 포커스 이동
    range.setStartAfter(brAfter);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 스크롤을 삽입된 위치로 이동
    hr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 이미지 파일 업로드
function insertImageFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const editor = document.getElementById('editor');
                const selection = window.getSelection();
                let range = null;
                
                if (selection.rangeCount > 0) {
                    range = selection.getRangeAt(0);
                } else {
                    range = document.createRange();
                    range.selectNodeContents(editor);
                    range.collapse(false);
                }
                
                const brBefore = document.createElement('br');
                range.insertNode(brBefore);
                range.setStartAfter(brBefore);
                
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '10px 0';
                
                range.insertNode(img);
                
                const brAfter = document.createElement('br');
                range.setStartAfter(img);
                range.insertNode(brAfter);
                
                img.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// 링크 제거
function removeLink() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const link = range.commonAncestorContainer.nodeType === 3 
            ? range.commonAncestorContainer.parentElement.closest('a')
            : range.commonAncestorContainer.closest('a');
        
        if (link) {
            const parent = link.parentNode;
            while (link.firstChild) {
                parent.insertBefore(link.firstChild, link);
            }
            parent.removeChild(link);
        } else {
            alert('링크를 선택해주세요.');
        }
    }
}

// 특수 문자 삽입
function insertSpecialCharacter() {
    const specialChars = [
        '©', '®', '™', '€', '£', '¥', '§', '¶', '†', '‡',
        '•', '…', '‰', '°', '′', '″', '‾', '⁄', '℅', '№',
        '℠', '℡', '™', 'Ω', '℧', 'ℨ', '℩', 'K', 'Å', 'ℬ',
        'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ',
        'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ',
        'φ', 'χ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ'
    ];
    
    const char = prompt('특수 문자를 선택하거나 직접 입력하세요:\n\n' + specialChars.join(' '), '');
    if (char) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(char));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            document.execCommand('insertText', false, char);
        }
    }
}

// 날짜 삽입
function insertDate() {
    const now = new Date();
    const options = [
        { label: 'YYYY-MM-DD', format: () => now.toISOString().split('T')[0] },
        { label: 'YYYY년 MM월 DD일', format: () => {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}년 ${month}월 ${day}일`;
        }},
        { label: 'YYYY/MM/DD', format: () => {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }},
        { label: 'YYYY-MM-DD HH:MM:SS', format: () => {
            return now.toLocaleString('ko-KR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }}
    ];
    
    const choice = prompt('날짜 형식을 선택하세요:\n1. YYYY-MM-DD\n2. YYYY년 MM월 DD일\n3. YYYY/MM/DD\n4. YYYY-MM-DD HH:MM:SS\n\n번호를 입력하세요 (1-4):', '1');
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < options.length) {
        const dateStr = options[index].format();
        document.execCommand('insertText', false, dateStr);
    }
}

// 페이지 나누기
function insertPageBreak() {
    const editor = document.getElementById('editor');
    const selection = window.getSelection();
    let range = null;
    
    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    } else {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
    }
    
    const pageBreak = document.createElement('div');
    pageBreak.style.pageBreakAfter = 'always';
    pageBreak.style.breakAfter = 'page';
    pageBreak.style.height = '0';
    pageBreak.style.margin = '0';
    pageBreak.style.padding = '0';
    pageBreak.style.border = 'none';
    pageBreak.className = 'page-break';
    
    const brBefore = document.createElement('br');
    range.insertNode(brBefore);
    range.setStartAfter(brBefore);
    range.insertNode(pageBreak);
    
    const brAfter = document.createElement('br');
    range.setStartAfter(pageBreak);
    range.insertNode(brAfter);
    
    range.setStartAfter(brAfter);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

// 찾기/바꾸기 다이얼로그
let findReplaceDialog = null;
function showFindReplaceDialog() {
    if (findReplaceDialog) {
        findReplaceDialog.style.display = 'block';
        return;
    }
    
    findReplaceDialog = document.createElement('div');
    findReplaceDialog.id = 'find-replace-dialog';
    findReplaceDialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border: 2px solid #4A6CF7;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        min-width: 400px;
    `;
    
    findReplaceDialog.innerHTML = `
        <h3 style="margin-top: 0; color: #4A6CF7;">찾기/바꾸기</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">찾을 내용:</label>
            <input type="text" id="find-text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">바꿀 내용:</label>
            <input type="text" id="replace-text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
            <label>
                <input type="checkbox" id="case-sensitive" style="margin-right: 5px;">
                대소문자 구분
            </label>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="find-next-btn" style="padding: 8px 16px; background: #4A6CF7; color: white; border: none; border-radius: 4px; cursor: pointer;">다음 찾기</button>
            <button id="replace-btn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">바꾸기</button>
            <button id="replace-all-btn" style="padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">모두 바꾸기</button>
            <button id="close-find-dialog-btn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">닫기</button>
        </div>
    `;
    
    document.body.appendChild(findReplaceDialog);
    
    let currentMatch = null;
    
    document.getElementById('find-next-btn').addEventListener('click', function() {
        const findText = document.getElementById('find-text').value;
        const caseSensitive = document.getElementById('case-sensitive').checked;
        
        if (!findText) {
            alert('찾을 내용을 입력하세요.');
            return;
        }
        
        const editor = document.getElementById('editor');
        const editorText = editor.innerText || editor.textContent;
        const searchText = caseSensitive ? editorText : editorText.toLowerCase();
        const searchFind = caseSensitive ? findText : findText.toLowerCase();
        
        const index = searchText.indexOf(searchFind, currentMatch ? currentMatch.index + 1 : 0);
        if (index === -1) {
            alert('더 이상 찾을 수 없습니다.');
            currentMatch = null;
            return;
        }
        
        currentMatch = { index, length: findText.length };
        highlightText(editor, index, findText.length);
    });
    
    document.getElementById('replace-btn').addEventListener('click', function() {
        const findText = document.getElementById('find-text').value;
        const replaceText = document.getElementById('replace-text').value;
        
        if (!findText) {
            alert('찾을 내용을 입력하세요.');
            return;
        }
        
        if (currentMatch) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(replaceText));
                currentMatch = null;
            }
        } else {
            document.getElementById('find-next-btn').click();
        }
    });
    
    document.getElementById('replace-all-btn').addEventListener('click', function() {
        const findText = document.getElementById('find-text').value;
        const replaceText = document.getElementById('replace-text').value;
        const caseSensitive = document.getElementById('case-sensitive').checked;
        
        if (!findText) {
            alert('찾을 내용을 입력하세요.');
            return;
        }
        
        const editor = document.getElementById('editor');
        const editorHTML = editor.innerHTML;
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
        editor.innerHTML = editorHTML.replace(regex, replaceText);
        
        alert('모든 항목을 바꿨습니다.');
    });
    
    document.getElementById('close-find-dialog-btn').addEventListener('click', function() {
        findReplaceDialog.style.display = 'none';
    });
    
    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && findReplaceDialog && findReplaceDialog.style.display !== 'none') {
            findReplaceDialog.style.display = 'none';
        }
    });
}

function highlightText(container, startIndex, length) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let currentIndex = 0;
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;
    
    let node;
    while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        
        if (!startNode && currentIndex + nodeLength >= startIndex) {
            startNode = node;
            startOffset = startIndex - currentIndex;
        }
        
        if (startNode && currentIndex + nodeLength >= startIndex + length) {
            endNode = node;
            endOffset = startIndex + length - currentIndex;
            break;
        }
        
        currentIndex += nodeLength;
    }
    
    if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        container.scrollTop = range.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 100;
    }
}

// 테이블 드래그 및 리사이즈 설정
let selectedTable = null;
let isDragging = false;
let isResizing = false;
let isTableDragSelecting = false; // 표 드래그로 선택 중인지
let dragStartPos = { x: 0, y: 0 };
let resizeDirection = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
let dragOffset = { x: 0, y: 0 };
let resizeStart = { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 };
let hoveredTable = null;
let pendingResizeDirection = null;
let pendingResizeTable = null;
let isCellRangeSelecting = false;
let selectionStartCell = null;
let selectionTable = null;
let selectedCellElements = [];
let hasCellRangeMoved = false;

function setupTableDragAndResize() {
    const editor = document.getElementById('editor');
    
    // 표 클릭 시 - 셀만 선택 (표 전체 선택 안 함)
    editor.addEventListener('click', function(e) {
        const table = e.target.closest('table');
        const cell = e.target.closest('td, th');
        const handle = e.target.closest('.table-handle');
        
        // 핸들을 클릭한 경우는 무시
        if (handle) {
            return;
        }
        
        // 셀 내부를 클릭한 경우
        if (table && cell) {
            // 셀 클릭 시: startCellRangeSelection에서 처리
            // 같은 셀을 다시 클릭하면 선택 해제 (토글)
            // 다른 셀을 클릭하면 새 선택 시작
            // startCellRangeSelection에서 처리하므로 여기서는 별도 처리 불필요
            return;
        }
        
        // 표 외부 클릭 시: 텍스트 선택은 유지하고 셀 선택만 해제
        if (!table) {
            clearCellSelection();
            removeContextCellHighlight();
            // 표 선택은 유지 (워드처럼 동작)
        }
    });
    
    // 표에서 mousedown 이벤트 - 드래그 시작 감지
    editor.addEventListener('mousedown', function(e) {
        const table = e.target.closest('table');
        const cell = e.target.closest('td, th');
        const handle = e.target.closest('.table-handle');
        
        // 핸들을 클릭한 경우는 핸들 이벤트 처리
        if (handle) {
            return;
        }
        
        // 셀 내부를 클릭한 경우: 셀 범위 선택 시작
        if (cell) {
            if (e.button === 0) {
                startCellRangeSelection(cell, e);
            }
            return;
        }
        
        // 표 내부를 클릭한 경우 드래그 선택 시작
        if (table) {
            dragStartPos.x = e.clientX;
            dragStartPos.y = e.clientY;
            isTableDragSelecting = true;
            
            const borderInfo = getTableBorderInfo(e, table);
            if (borderInfo.isOnBorder) {
                pendingResizeDirection = borderInfo.direction;
                pendingResizeTable = table;
                if (selectedTable !== table) {
                    selectTable(table);
                }
                isTableDragSelecting = false;
                return;
            }
            
            // 이미 선택된 표이고 테두리를 클릭한 경우 리사이즈 시작
            if (selectedTable === table) {
                const borderInfo = getTableBorderInfo(e, table);
                if (borderInfo.isOnBorder) {
                    pendingResizeDirection = borderInfo.direction;
                    pendingResizeTable = table;
                    isTableDragSelecting = false;
                    return;
                }
            }
        }
    });
    
    // 마우스 이동 이벤트 - 드래그 선택 처리
    editor.addEventListener('mousemove', function(e) {
        const table = e.target.closest('table');
        const cell = e.target.closest('td, th');
        
        // 셀 범위 드래그 선택
        if (isCellRangeSelecting && selectionTable && (e.buttons & 1) && cell && cell.closest('table') === selectionTable) {
            updateCellRangeSelection(cell);
        }
        
        // 드래그 선택 중인 경우
        if (isTableDragSelecting && table && !cell) {
            const dragDistance = Math.sqrt(
                Math.pow(e.clientX - dragStartPos.x, 2) + 
                Math.pow(e.clientY - dragStartPos.y, 2)
            );
            
            // 5px 이상 드래그하면 표 선택 모드로 전환
            if (dragDistance > 5) {
                if (selectedTable !== table) {
                    selectTable(table);
                }
                
                // 테두리를 드래그하는지 확인
                const borderInfo = getTableBorderInfo(e, table);
                if (borderInfo.isOnBorder) {
                    isTableDragSelecting = false;
                    startResizeFromBorder(e, table, borderInfo.direction);
                } else {
                    // 표 내부를 드래그하면 이동 시작
                    isTableDragSelecting = false;
                    startDragFromTable(e, table);
                }
            }
        }
        
        // 대기 중인 리사이즈 시작
        if (!isResizing && pendingResizeDirection && pendingResizeTable) {
            const dragDistance = Math.sqrt(
                Math.pow(e.clientX - dragStartPos.x, 2) + 
                Math.pow(e.clientY - dragStartPos.y, 2)
            );
            if (dragDistance > 3) {
                startResizeFromBorder(e, pendingResizeTable, pendingResizeDirection);
                pendingResizeDirection = null;
                pendingResizeTable = null;
            }
        }
        
        // 선택된 표에 마우스 오버 시 커서 변경
        if (table && selectedTable === table && !cell && !isDragging && !isResizing && !isTableDragSelecting) {
            const borderInfo = getTableBorderInfo(e, table);
            if (borderInfo.isOnBorder) {
                table.style.cursor = getResizeCursor(borderInfo.direction);
                table.classList.add('table-border-hover');
                hoveredTable = table;
            } else {
                table.style.cursor = 'move';
                if (hoveredTable) {
                    hoveredTable.classList.remove('table-border-hover');
                    hoveredTable = null;
                }
            }
        } else if (table && !cell && selectedTable !== table) {
            table.style.cursor = '';
            if (hoveredTable) {
                hoveredTable.classList.remove('table-border-hover');
                hoveredTable = null;
            }
        } else if (!table && hoveredTable) {
            hoveredTable.classList.remove('table-border-hover');
            hoveredTable = null;
        }
    });
    
    // 마우스 업 이벤트 - 드래그 선택 종료
    document.addEventListener('mouseup', function(e) {
        if (isTableDragSelecting) {
            isTableDragSelecting = false;
        }
        pendingResizeDirection = null;
        pendingResizeTable = null;
        
        if (isCellRangeSelecting) {
            isCellRangeSelecting = false;
            // 단일 클릭(드래그하지 않은 경우)에도 선택 상태 유지
            if (!hasCellRangeMoved) {
                // 단일 클릭: 선택 상태 유지 (워드처럼 동작)
                // startCellRangeSelection에서 이미 셀을 선택하거나 해제했으므로
                // selectionStartCell이 null이 아니고 선택되지 않은 경우에만 추가
                if (selectionStartCell && !selectedCellElements.includes(selectionStartCell)) {
                    // 선택이 안 된 경우에만 추가 (같은 셀을 다시 클릭해서 해제된 경우는 제외)
                    selectionStartCell.classList.add('table-cell-selected');
                    selectedCellElements.push(selectionStartCell);
                }
            }
            // selectionStartCell과 selectionTable은 유지하여 
            // 툴바 버튼 클릭 시에도 선택된 셀에 서식 적용 가능하도록 함
            // 단, 모든 선택이 해제된 경우는 null로 설정됨
            hasCellRangeMoved = false;
        }
    });
    
    // 문서 클릭 시 선택 해제 (툴바 영역 제외)
    document.addEventListener('click', function(e) {
        // 툴바 영역 클릭 시 선택 유지 (워드처럼 동작)
        const toolbar = e.target.closest('.toolbar');
        const toolbarGroup = e.target.closest('.toolbar-group');
        const contextMenu = e.target.closest('.table-context-menu');
        const findDialog = e.target.closest('#find-replace-dialog');
        
        // 툴바, 컨텍스트 메뉴, 찾기 다이얼로그 영역은 선택 유지
        if (toolbar || toolbarGroup || contextMenu || findDialog) {
            // 워드처럼: 툴바 클릭 시에도 텍스트/셀 선택 유지
            return;
        }
        
        // 에디터 외부 클릭 시에만 선택 해제
        const editor = document.getElementById('editor');
        if (!editor.contains(e.target)) {
            // 에디터 외부 클릭 시에만 선택 해제
            const editorContainer = e.target.closest('.editor-container');
            if (!editorContainer || !editorContainer.contains(editor)) {
                deselectTable();
                // 텍스트 선택도 해제 (워드처럼 동작)
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    selection.removeAllRanges();
                }
            }
        } else {
            // 에디터 내부 클릭 시: 새로운 선택을 시작하는 경우에만 이전 선택 해제
            const cell = e.target.closest('td, th');
            const table = e.target.closest('table');
            
            // 셀을 클릭한 경우: 선택 상태 유지
            if (cell && table) {
                // 같은 셀을 클릭한 경우: 선택 유지
                // 다른 셀을 클릭한 경우: startCellRangeSelection에서 처리
                // 여기서는 선택을 해제하지 않음 (선택 상태 유지)
            } else if (!cell && !table) {
                // 에디터 내부이지만 테이블이 아닌 곳 클릭 시
                // 셀 선택만 해제, 텍스트 선택은 유지 (워드처럼 동작)
                clearCellSelection();
                removeContextCellHighlight();
            }
        }
    });
    
    // ESC 키로 선택 해제
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            deselectTable();
        }
    });
}

// 표 테두리 정보 가져오기
function getTableBorderInfo(e, table) {
    const rect = table.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const borderThreshold = 10; // 테두리 감지 영역 (픽셀)
    
    const isOnLeft = x <= borderThreshold;
    const isOnRight = x >= rect.width - borderThreshold;
    const isOnTop = y <= borderThreshold;
    const isOnBottom = y >= rect.height - borderThreshold;
    
    let direction = null;
    let isOnBorder = false;
    
    if (isOnTop && isOnLeft) {
        direction = 'nw';
        isOnBorder = true;
    } else if (isOnTop && isOnRight) {
        direction = 'ne';
        isOnBorder = true;
    } else if (isOnBottom && isOnLeft) {
        direction = 'sw';
        isOnBorder = true;
    } else if (isOnBottom && isOnRight) {
        direction = 'se';
        isOnBorder = true;
    } else if (isOnTop) {
        direction = 'n';
        isOnBorder = true;
    } else if (isOnBottom) {
        direction = 's';
        isOnBorder = true;
    } else if (isOnLeft) {
        direction = 'w';
        isOnBorder = true;
    } else if (isOnRight) {
        direction = 'e';
        isOnBorder = true;
    }
    
    return { isOnBorder, direction };
}

// 리사이즈 커서 반환
function getResizeCursor(direction) {
    const cursors = {
        'nw': 'nwse-resize',
        'ne': 'nesw-resize',
        'sw': 'nesw-resize',
        'se': 'nwse-resize',
        'n': 'ns-resize',
        's': 'ns-resize',
        'e': 'ew-resize',
        'w': 'ew-resize'
    };
    return cursors[direction] || 'default';
}

function startDragFromTable(e, table) {
    // 셀 내부가 아닐 때만 드래그 시작
    const cell = e.target.closest('td, th');
    if (cell) return;
    
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    
    const rect = table.getBoundingClientRect();
    // 드래그 시작 위치 저장 (드래그 시작 시점의 마우스 위치 기준)
    dragOffset.x = dragStartPos.x - rect.left;
    dragOffset.y = dragStartPos.y - rect.top;
    
    table.style.cursor = 'move';
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
}

function startResizeFromBorder(e, table, direction) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeDirection = direction;
    
    const rect = table.getBoundingClientRect();
    // 드래그 시작 시점의 위치 사용
    resizeStart.x = dragStartPos.x;
    resizeStart.y = dragStartPos.y;
    resizeStart.width = rect.width;
    resizeStart.height = rect.height;
    resizeStart.left = rect.left;
    resizeStart.top = rect.top;
    
    table.style.cursor = getResizeCursor(direction);
    document.body.style.cursor = getResizeCursor(direction);
    document.body.style.userSelect = 'none';
}

function applySpellcheckSettings(root) {
    if (!root) return;
    
    const elements = root.querySelectorAll
        ? root.querySelectorAll('[contenteditable="true"]')
        : [];
    
    elements.forEach(el => {
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('data-gramm', 'false');
        el.setAttribute('data-gramm_editor', 'false');
        el.setAttribute('data-enable-grammarly', 'false');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('autocomplete', 'off');
        el.setAttribute('autocapitalize', 'off');
    });
    
    if (root.getAttribute && root.getAttribute('contenteditable') === 'true') {
        root.setAttribute('spellcheck', 'false');
        root.setAttribute('data-gramm', 'false');
        root.setAttribute('data-gramm_editor', 'false');
        root.setAttribute('data-enable-grammarly', 'false');
        root.setAttribute('autocorrect', 'off');
        root.setAttribute('autocomplete', 'off');
        root.setAttribute('autocapitalize', 'off');
    }
}

function selectTable(table) {
    deselectTable();
    selectedTable = table;
    table.classList.add('table-selected');
    createTableHandles(table);
}

function selectEntireTable(table) {
    if (!table) return;
    
    selectTable(table);
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNode(table);
    selection.removeAllRanges();
    selection.addRange(range);
    
    table.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function highlightContextCell(cell) {
    removeContextCellHighlight();
    if (cell) {
        cell.classList.add('table-context-highlight');
        lastHighlightedCell = cell;
    }
}

function removeContextCellHighlight() {
    if (lastHighlightedCell) {
        lastHighlightedCell.classList.remove('table-context-highlight');
        lastHighlightedCell = null;
    }
}

function startCellRangeSelection(cell) {
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    
    // 이미 선택된 셀 중 하나를 클릭한 경우: 선택 해제 (토글)
    if (selectedCellElements.length > 0 && selectedCellElements.includes(cell)) {
        // 같은 셀을 다시 클릭한 경우: 선택 해제
        const index = selectedCellElements.indexOf(cell);
        if (index > -1) {
            selectedCellElements.splice(index, 1);
        }
        cell.classList.remove('table-cell-selected');
        removeContextCellHighlight();
        
        // 모든 선택이 해제되면 초기화
        if (selectedCellElements.length === 0) {
            selectionStartCell = null;
            selectionTable = null;
        }
        return;
    }
    
    // 다른 셀을 클릭한 경우: 새 선택 시작
    selectionTable = table;
    selectionStartCell = cell;
    isCellRangeSelecting = true;
    hasCellRangeMoved = false;
    
    // 이전 선택 해제하고 새 선택 시작
    clearCellSelection();
    
    // 단일 클릭 시에도 셀 선택 상태 유지
    cell.classList.add('table-cell-selected');
    selectedCellElements.push(cell);
    
    highlightContextCell(cell);
}

function updateCellRangeSelection(targetCell) {
    if (!selectionStartCell || !selectionTable) return;
    if (!targetCell || targetCell.closest('table') !== selectionTable) return;
    
    const startPos = getCellPosition(selectionStartCell);
    const endPos = getCellPosition(targetCell);
    if (!startPos || !endPos) return;
    
    if (startPos.rowIndex === endPos.rowIndex && startPos.colIndex === endPos.colIndex && !hasCellRangeMoved) {
        return;
    }
    
    const minRow = Math.min(startPos.rowIndex, endPos.rowIndex);
    const maxRow = Math.max(startPos.rowIndex, endPos.rowIndex);
    let minCol = Math.min(startPos.colIndex, endPos.colIndex);
    let maxCol = Math.max(startPos.colIndex, endPos.colIndex);
    
    // 시작 셀이 2열 이상(인덱스 >= 1)인 경우, 1열을 선택 범위에서 제외
    // 즉, 2열부터 드래그한 경우 1열이 포함되지 않도록 함
    if (startPos.colIndex > 0) {
        // 시작 셀이 2열 이상이면, 선택 범위에서 1열(인덱스 0)을 제외
        if (minCol === 0) {
            minCol = 1; // 1열을 제외하고 2열부터 선택
        }
    }
    
    clearCellSelection();
    
    for (let r = minRow; r <= maxRow; r++) {
        const row = selectionTable.rows[r];
        if (!row) continue;
        for (let c = minCol; c <= maxCol; c++) {
            const cell = row.cells[c];
            if (!cell) continue;
            cell.classList.add('table-cell-selected');
            selectedCellElements.push(cell);
        }
    }
    
    hasCellRangeMoved = true;
    highlightContextCell(targetCell);
}

function clearCellSelection() {
    selectedCellElements.forEach(cell => cell.classList.remove('table-cell-selected'));
    selectedCellElements = [];
}

function getCellPosition(cell) {
    const table = cell.closest('table');
    if (!table) return null;
    const row = cell.parentElement;
    const rowIndex = Array.from(table.rows).indexOf(row);
    const colIndex = Array.from(row.cells).indexOf(cell);
    if (rowIndex === -1 || colIndex === -1) return null;
    return { rowIndex, colIndex };
}

function deselectTable() {
    if (selectedTable) {
        selectedTable.classList.remove('table-selected');
        removeTableHandles();
        selectedTable = null;
    }
    clearCellSelection();
    removeContextCellHighlight();
}

function createTableHandles(table) {
    // 기존 핸들 제거
    removeTableHandles();
    
    // wrapper 확인 및 생성
    let wrapper = table.parentElement;
    if (!wrapper || !wrapper.classList.contains('table-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.width = '100%';
        
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }
    
    // 드래그 핸들 생성
    const dragHandle = document.createElement('div');
    dragHandle.className = 'table-handle table-drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = '드래그하여 이동';
    
    // 리사이즈 핸들 생성
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'table-handle table-resize-handle';
    resizeHandle.title = '드래그하여 크기 조절';
    
    // 핸들을 wrapper에 추가
    wrapper.appendChild(dragHandle);
    wrapper.appendChild(resizeHandle);
    
    // 드래그 이벤트
    dragHandle.addEventListener('mousedown', startDrag);
    resizeHandle.addEventListener('mousedown', startResize);
    
    // 마우스 이동 이벤트는 이미 전역으로 등록되어 있음
}

function removeTableHandles() {
    const wrapper = document.querySelector('.table-wrapper');
    if (wrapper) {
        const dragHandle = wrapper.querySelector('.table-drag-handle');
        const resizeHandle = wrapper.querySelector('.table-resize-handle');
        if (dragHandle) dragHandle.remove();
        if (resizeHandle) resizeHandle.remove();
    }
}

function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    
    const rect = selectedTable.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    selectedTable.style.cursor = 'move';
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
}

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    
    const rect = selectedTable.getBoundingClientRect();
    resizeStart.x = e.clientX;
    resizeStart.y = e.clientY;
    resizeStart.width = rect.width;
    resizeStart.height = rect.height;
    
    selectedTable.style.cursor = 'nwse-resize';
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
}

function handleMouseMove(e) {
    if (isDragging && selectedTable) {
        const editor = document.getElementById('editor');
        const editorRect = editor.getBoundingClientRect();
        
        // 에디터 내에서만 이동 가능
        let newX = e.clientX - editorRect.left - dragOffset.x;
        let newY = e.clientY - editorRect.top - dragOffset.y;
        
        // 경계 체크
        newX = Math.max(0, Math.min(newX, editorRect.width - selectedTable.offsetWidth));
        newY = Math.max(0, newY);
        
        selectedTable.style.position = 'absolute';
        selectedTable.style.left = newX + 'px';
        selectedTable.style.top = newY + 'px';
        selectedTable.style.margin = '0';
    } else if (isResizing && selectedTable && resizeDirection) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newLeft = null;
        let newTop = null;
        
        // 방향에 따라 크기 조절
        if (resizeDirection.includes('e')) {
            newWidth = resizeStart.width + deltaX;
        }
        if (resizeDirection.includes('w')) {
            newWidth = resizeStart.width - deltaX;
            newLeft = resizeStart.left + deltaX;
        }
        if (resizeDirection.includes('s')) {
            newHeight = resizeStart.height + deltaY;
        }
        if (resizeDirection.includes('n')) {
            newHeight = resizeStart.height - deltaY;
            newTop = resizeStart.top + deltaY;
        }
        
        // 최소 크기 제한
        newWidth = Math.max(200, newWidth);
        newHeight = Math.max(100, newHeight);
        
        selectedTable.style.width = newWidth + 'px';
        selectedTable.style.height = newHeight + 'px';
        
        // 위치 조정 (왼쪽/위쪽 리사이즈 시)
        if (newLeft !== null) {
            const editor = document.getElementById('editor');
            const editorRect = editor.getBoundingClientRect();
            const relativeLeft = newLeft - editorRect.left;
            if (selectedTable.style.position === 'absolute') {
                selectedTable.style.left = Math.max(0, relativeLeft) + 'px';
            }
        }
        if (newTop !== null) {
            const editor = document.getElementById('editor');
            const editorRect = editor.getBoundingClientRect();
            const relativeTop = newTop - editorRect.top;
            if (selectedTable.style.position === 'absolute') {
                selectedTable.style.top = Math.max(0, relativeTop) + 'px';
            }
        }
    }
}

function handleMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        if (selectedTable) {
            selectedTable.style.cursor = '';
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
    
    if (isResizing) {
        isResizing = false;
        resizeDirection = null;
        if (selectedTable) {
            selectedTable.style.cursor = '';
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
}

// 텍스트 노드 가져오기 유틸리티 함수
function getTextNodesIn(node) {
    const textNodes = [];
    if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node);
    } else {
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            textNodes.push(...getTextNodesIn(children[i]));
        }
    }
    return textNodes;
}

