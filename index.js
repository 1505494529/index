// --- LeanCloud 配置 ---
const appId = 'u5pWcozRkszZa6trQkNcHdzG-gzGzoHsz'; // 替换为你的 App ID
const appKey = '2Ej07YLEQhCqyVWVVYhsWOxc'; // 替换为你的 App Key
const serverURL = 'https://u5pwcozr.lc-cn-n1-shared.com'; // 替换为你的 API 域名
const className = 'Config';
const configKey = 'index';
const apiUrlBase = `${serverURL}/1.1/classes/${className}`;
const headers = {
    'X-LC-Id': appId,
    'X-LC-Key': appKey,
    'Content-Type': 'application/json'
};

// --- 全局变量 ---
let linksData = [];
let configObjectId = null;
let draggedItem = null; // 被拖拽的 DOM 元素
let placeholder = null; // 占位符 DOM 元素

// --- 辅助函数 ---
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// --- LeanCloud API 操作 ---

async function fetchData() {
    console.log('Fetching data...');
    const loadingElement = document.querySelector('.loading-placeholder');
    if (loadingElement) loadingElement.style.display = 'block';

    const queryUrl = `${apiUrlBase}?where={"Key":"${configKey}"}`;
    try {
        const response = await fetch(queryUrl, { method: 'GET', headers: headers });
        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try { const errorData = await response.json(); errorMsg += ` - ${errorData.error || JSON.stringify(errorData)}`; } catch (e) {}
            throw new Error(errorMsg);
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const configObject = data.results[0];
            configObjectId = configObject.objectId;
            try {
                linksData = JSON.parse(configObject.Value || '[]');
                if (!Array.isArray(linksData)) { linksData = []; }
                linksData = linksData.map(item => ({ ...item, localId: item.localId || generateUUID() }));
                console.log('Data loaded:', linksData.length, 'items');
            } catch (e) {
                console.error('Failed to parse Value JSON:', e); linksData = []; alert('加载数据格式错误');
            }
        } else {
            console.log('No config object found. Will create on first save.'); linksData = []; configObjectId = null;
        }
        renderLinks(); // First render after fetching
    } catch (error) {
        console.error('Error fetching data:', error); alert(`获取数据失败: ${error.message}`);
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

async function saveData() {
    console.log('Saving data...');
    // Disable UI interactions during save? (Optional, advanced)
    // document.body.style.pointerEvents = 'none';

    const dataToSave = linksData.map(({ localId, ...rest }) => rest);
    const valueString = JSON.stringify(dataToSave);

    const body = { Value: valueString };
    let url = apiUrlBase;
    let method = 'POST';

    if (configObjectId) { url = `${apiUrlBase}/${configObjectId}`; method = 'PUT'; }
    else { body.Key = configKey; }

    try {
        const response = await fetch(url, { method: method, headers: headers, body: JSON.stringify(body) });
        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
             try { const errorData = await response.json(); errorMsg += ` - ${errorData.error || JSON.stringify(errorData)}`; } catch (e) {}
            throw new Error(errorMsg);
        }
        const result = await response.json();

        if (method === 'POST' && result.objectId) { configObjectId = result.objectId; console.log('Config created:', configObjectId); }
        else { console.log('Data updated.'); }
        // Re-render after successful save. Although data is updated,
        // re-rendering ensures perfect sync and applies any potential visual state logic.
        renderLinks();
    } catch (error) {
        console.error('Error saving data:', error); alert(`保存数据失败: ${error.message}`);
        // Consider fetching data again to revert local state on save failure
        // fetchData();
    } finally {
        // Re-enable UI interactions if disabled
        // document.body.style.pointerEvents = '';
    }
}

// --- DOM 操作 ---

function renderLinks() {
    const linksContainer = document.getElementById('linksContainer');
    const currentScroll = linksContainer.scrollTop;
    linksContainer.innerHTML = ''; // Clear previous items

    if (linksData.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = '还没有添加任何链接。';
        emptyMsg.style.cssText = 'text-align: center; color: #888; padding: 20px;';
        linksContainer.appendChild(emptyMsg);
    } else {
        linksData.forEach((item) => {
            const linkDiv = document.createElement('div');
            linkDiv.classList.add('link-item');
            linkDiv.dataset.localId = item.localId;
            linkDiv.draggable = true;

            // --- Click handler (unchanged) ---
            linkDiv.addEventListener('click', (event) => {
                if (event.target.closest('button')) return;
                if (item.src) {
                    let urlToOpen = item.src;
                    if (!urlToOpen.match(/^https?:\/\//i) && !urlToOpen.startsWith('//')) { urlToOpen = 'http://' + urlToOpen; }
                    try { window.open(urlToOpen, '_blank'); } catch (e) { alert("无法打开链接，地址可能无效。"); }
                } else { alert('该记录没有有效的链接地址。'); }
            });

            // --- Create content (unchanged) ---
            const linkText = document.createElement('p'); linkText.textContent = item.name;
            const actionButtons = document.createElement('div'); actionButtons.classList.add('action-buttons');
            const updateButton = document.createElement('button'); updateButton.textContent = '修改'; updateButton.classList.add('update-button');
            updateButton.onclick = (event) => { event.stopPropagation(); updateLink(item.localId); };
            const deleteButton = document.createElement('button'); deleteButton.textContent = '删除'; deleteButton.classList.add('delete-button');
            deleteButton.onclick = (event) => { event.stopPropagation(); deleteLink(item.localId); };
            actionButtons.appendChild(updateButton); actionButtons.appendChild(deleteButton);
            linkDiv.appendChild(linkText); linkDiv.appendChild(actionButtons);

            addDragEventsForItem(linkDiv); // Add item-specific listeners

            linksContainer.appendChild(linkDiv);
        });
        linksContainer.scrollTop = currentScroll; // Restore scroll position
    }
    // Ensure container listeners are added
    addContainerDragEvents();
}

// --- 占位符管理 ---
function getPlaceholder() {
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.classList.add('drag-placeholder');
    }
    return placeholder;
}

function removePlaceholder() {
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
}

// --- 拖拽事件处理 ---

function addDragEventsForItem(item) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
}

function addContainerDragEvents() {
    const linksContainer = document.getElementById('linksContainer');
    if (!linksContainer.dataset.dragListenersAdded) {
        linksContainer.addEventListener('dragover', handleDragOverContainer);
        linksContainer.addEventListener('drop', handleDropContainer);
        linksContainer.addEventListener('dragleave', handleDragLeaveContainer);
        linksContainer.dataset.dragListenersAdded = 'true';
        // console.log("Container drag listeners added.");
    }
}

function handleDragStart(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') { e.preventDefault(); return; }
    draggedItem = this;
    try { e.dataTransfer.effectAllowed = 'move'; } catch (ex) {}
    try { e.dataTransfer.setData('text/plain', this.dataset.localId); } catch (ex) {}
    setTimeout(() => { if (draggedItem) draggedItem.classList.add('dragging'); }, 0);
}

function handleDragOverContainer(e) {
    e.preventDefault();
    if (!draggedItem) return;
    try { e.dataTransfer.dropEffect = 'move'; } catch (ex) {}

    const container = this;
    const currentPlaceholder = getPlaceholder();
    // Query *all* children that are either link items (not dragging) or the placeholder itself
    const potentialElements = [...container.querySelectorAll('.link-item:not(.dragging), .drag-placeholder')];

    let elementAfterCursor = null;
    for (const item of potentialElements) {
         // Skip the placeholder itself when determining position
         if (item === currentPlaceholder) continue;

        const rect = item.getBoundingClientRect();
        // Determine insertion point based on being above the vertical midpoint
        const midpointY = rect.top + rect.height / 2;
        if (e.clientY < midpointY) {
            elementAfterCursor = item;
            break; // Found the first item that should be after the insertion point
        }
    }

    // Insert placeholder logic
    if (elementAfterCursor) {
        // Insert before the found element if placeholder is not already there
        if (currentPlaceholder.nextSibling !== elementAfterCursor) {
            container.insertBefore(currentPlaceholder, elementAfterCursor);
        }
    } else {
        // If no element found to insert before, append to end (if not already last child)
        if (container.lastElementChild !== currentPlaceholder) {
            container.appendChild(currentPlaceholder);
        }
    }
}

function handleDragLeaveContainer(e) {
    // Remove placeholder if cursor leaves the container bounds
    // Check relatedTarget to avoid removing when moving between items
    if (!this.contains(e.relatedTarget) && e.relatedTarget !== placeholder) {
        // console.log("Mouse left container, removing placeholder.");
        removePlaceholder();
    }
}

function handleDropContainer(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) { removePlaceholder(); return; }

    const currentPlaceholder = getPlaceholder();
    let newIndex = -1; // Initialize target index

    // Calculate index based on final placeholder position in DOM
    if (currentPlaceholder.parentNode === this) {
        let count = 0;
        let element = this.firstElementChild;
        while (element) {
            if (element === currentPlaceholder) {
                newIndex = count; // Index is count of valid items before placeholder
                break;
            }
            // Only count actual link items that are NOT the one being dragged
            if (element.classList.contains('link-item') && element !== draggedItem) {
                 count++;
            }
            element = element.nextElementSibling;
        }
         // If placeholder wasn't found but was expected (e.g., appended at end)
         if (newIndex === -1 && this.contains(currentPlaceholder)) {
            // Count all valid non-dragged items as the index
            newIndex = [...this.children].filter(el => el.classList.contains('link-item') && el !== draggedItem).length;
        }
    } else {
        console.warn("Placeholder not in container on drop.");
    }

    // Always remove placeholder after calculation
    removePlaceholder();

    // --- Data Sorting ---
    if (newIndex !== -1) { // Proceed only if index calculation was successful
        const draggedId = draggedItem.dataset.localId;
        const originalDataIndex = linksData.findIndex(item => item.localId === draggedId);

        if (originalDataIndex !== -1) {
             // Avoid moving if the calculated index is the same as the original
             // (or adjacent if moving down, check required)
             let effectiveNewIndex = newIndex;
             // If moving down, the target index in the *original* array is one less
             if (originalDataIndex < newIndex) {
                 effectiveNewIndex = newIndex; // The calculated index is correct after removal
             } else {
                 effectiveNewIndex = newIndex; // The calculated index is correct before removal
             }

            // Check if a move is actually needed
             if (originalDataIndex !== effectiveNewIndex) {
                console.log(`Data: Moving item from original index ${originalDataIndex} to DOM-based index ${newIndex}`);
                const [movedItem] = linksData.splice(originalDataIndex, 1);
                linksData.splice(effectiveNewIndex, 0, movedItem);
                console.log("Saving new data order...");
                saveData(); // Save and trigger re-render
             } else {
                 console.log("Drop resulted in no change of order.");
                  // No data change, but re-render to ensure clean state if needed
                  renderLinks();
             }

        } else {
            console.error("Dragged item data not found!");
            renderLinks(); // Force re-render
        }
    } else {
        console.log("Drop failed to determine new index. No data change.");
         // No data change, re-render just in case visuals need reset
         renderLinks();
    }
    // draggedItem reset in dragend
}

function handleDragEnd(e) {
    // --- Final Cleanup ---
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        // Restore visibility if it was changed
        // draggedItem.style.visibility = '';
    }
    removePlaceholder(); // Ensure placeholder is removed
    draggedItem = null;
}

// --- CRUD Link Operations ---

function addLink() {
    const srcInput = document.getElementById('srcInput');
    const nameInput = document.getElementById('nameInput');
    const src = srcInput.value.trim(); const name = nameInput.value.trim();
    if (!name) { alert('记录名不能为空！'); nameInput.focus(); return; }
    if (!src) { alert('地址不能为空！'); srcInput.focus(); return; }
    const newItem = { name: name, src: src, localId: generateUUID() };
    linksData.push(newItem); saveData();
    srcInput.value = ''; nameInput.value = ''; nameInput.focus();
}

function updateLink(localId) {
    const itemIndex = linksData.findIndex(item => item.localId === localId);
    if (itemIndex === -1) return; const item = linksData[itemIndex];
    const newName = prompt(`修改记录名 (当前: ${item.name}):`, item.name); if (newName === null) return;
    const newSrc = prompt(`修改地址 (当前: ${item.src}):`, item.src); if (newSrc === null) return;
    const trimmedNewName = newName.trim(); const trimmedNewSrc = newSrc.trim();
    if (!trimmedNewName) { alert("记录名不能为空！"); return; } if (!trimmedNewSrc) { alert("地址不能为空！"); return; }
    const nameChanged = trimmedNewName !== item.name; const srcChanged = trimmedNewSrc !== item.src;
    if (nameChanged || srcChanged) { linksData[itemIndex].name = trimmedNewName; linksData[itemIndex].src = trimmedNewSrc; saveData(); }
}

function deleteLink(localId) {
    const itemIndex = linksData.findIndex(item => item.localId === localId);
    if (itemIndex === -1) return; const item = linksData[itemIndex];
    if (confirm(`确定要删除 "${item.name}" 吗？`)) { linksData.splice(itemIndex, 1); saveData(); }
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    const loadingElement = document.querySelector('.loading-placeholder');
    if(loadingElement) loadingElement.style.display = 'block';
    fetchData();
    // addContainerDragEvents is called inside renderLinks
});
