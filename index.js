const appId = 'u5pWcozRkszZa6trQkNcHdzG-gzGzoHsz';
const appKey = '2Ej07YLEQhCqyVWVVYhsWOxc';
const host = 'u5pwcozr.lc-cn-n1-shared.com';
const objectId = 'srcList';
const url = `https://${host}/1.1/classes/${objectId}`;
const headers = {
    'X-LC-Id': appId,
    'X-LC-Key': appKey,
    'Content-Type': 'application/json'
};

function get() {
    fetch(url, {
        method: 'GET',
        headers: headers
    })
    .then(res => res.json())
    .then(res => {
        const linksDiv = document.querySelector('.links');
        linksDiv.innerHTML = ''; 
        res.results.forEach(item => {
            const linkDiv = document.createElement('div');
            linkDiv.classList.add('link-item');
            linkDiv.addEventListener('click', (event) => {
                // 检查点击的是不是按钮
                if (!event.target.closest('.update-button, .delete-button')) {
                    // 如果不是按钮，则打开链接
                    window.open(item.src, '_blank');
                }
            });
            const link = document.createElement('p');
            link.href = item.src;
            link.textContent = item.name;
            link.target = '_blank';
            
            const actionButtons = document.createElement('div');
            actionButtons.classList.add('action-buttons');

            const updateButton = document.createElement('button');
            updateButton.textContent = '修改';
            updateButton.classList.add('update-button');
            updateButton.onclick = event => {
                event.preventDefault();
                const newSrc = prompt('请输入地址:', item.src);
                if (!newSrc) newSrc = item.src;
                const newName = prompt('请输入记录名:', item.name);
                if (!newName) newName = item.name;
                if (newSrc != item.src || newName != item.name) {
                    put(item.objectId, newSrc, newName);
                }
            };

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = event => {
                event.preventDefault();
                if (confirm('你确定要删除该记录吗?')) {
                    del(item.objectId);
                }
            };

            actionButtons.appendChild(updateButton);
            actionButtons.appendChild(deleteButton);
            
            linkDiv.appendChild(link);
            linkDiv.appendChild(actionButtons);
            
            linksDiv.appendChild(linkDiv);
        });
    })
    .catch(error => console.error('获取数据出错:', error));
}

function add() {
    const src = document.getElementById('srcInput').value;
    const name = document.getElementById('nameInput').value;
    if (src && name) {
        post(src, name);
    }
}

function post(src, name) {
    const body = JSON.stringify({
        src: src,
        name: name
    });
    fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    })
    .then(res => res.json())
    .then(res => {
        get(); 
    })
    .catch(error => console.error('添加数据出错:', error));
}

function put(id, src, name) {
    const body = JSON.stringify({
        src: src,
        name: name
    });
    fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: headers,
        body: body
    })
    .then(res => res.json())
    .then(res => {
        get(); 
    })
    .catch(error => console.error('更新数据出错:', error));
}

function del(id) {
    fetch(`${url}/${id}`, {
        method: 'DELETE',
        headers: headers
    })
    .then(res => res.json())
    .then(res => {
        get();
    })
    .catch(error => console.error('删除数据出错:', error));
}

get();
