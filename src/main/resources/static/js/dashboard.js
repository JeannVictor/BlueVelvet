document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const tableBody = document.querySelector('#categoryTable tbody');
    const modal = document.getElementById('modal');
    const detailsModal = document.getElementById('detailsModal');
    const modalTitle = document.getElementById('modalTitle');
    const categoryNameInput = document.getElementById('categoryName');
    const parentCategorySelect = document.getElementById('parentCategory');
    const categoryEnabledCheckbox = document.getElementById('categoryEnabled');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sortBtn = document.getElementById('sortBtn');
    const exportBtn = document.getElementById('exportBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');

    // Variáveis de estado
    let currentCategoryId = null;
    let currentPage = 0;
    let pageSize = 10;
    let currentSort = 'name,asc';
    let currentSearch = '';
    let currentStatusFilter = 'all';
    let currentTypeFilter = 'all';
    let totalCategories = 0;
    let totalPages = 0;

    // === INICIALIZAÇÃO ===
    async function init() {
        await loadUserInfo();
        await loadParentCategories();
        await loadCategories(0);
        setupEventListeners();
    }

    function setupEventListeners() {
        // Botões principais
        document.getElementById('addCategoryBtn').addEventListener('click', openAddModal);
        saveBtn.addEventListener('click', saveCategory);
        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        logoutBtn.addEventListener('click', logout);

        // Busca e filtros
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        sortBtn.addEventListener('click', toggleSort);
        exportBtn.addEventListener('click', exportToCSV);
        resetBtn.addEventListener('click', resetCategories);

        // Filtros
        statusFilter.addEventListener('change', handleFilterChange);
        typeFilter.addEventListener('change', handleFilterChange);
        itemsPerPageSelect.addEventListener('change', handlePageSizeChange);

        // Eventos da tabela (delegação)
        tableBody.addEventListener('click', handleTableClick);

        // Fechar modal de detalhes com X
        document.querySelector('#detailsModal .close-btn').addEventListener('click', closeDetailsModal);
    }

    // === CARREGAR INFORMAÇÕES DO USUÁRIO ===
    async function loadUserInfo() {
        try {
            // Simular dados do usuário (em produção, viria do backend)
            const userInfo = {
                email: 'admin@bluevelvet.com',
                role: 'Administrator'
            };

            document.getElementById('userWelcome').textContent = `Bem-vindo, ${userInfo.email}`;
            document.getElementById('userInfo').textContent = `${userInfo.role}`;
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    // === CARREGAR CATEGORIAS PAI PARA O SELECT ===
    async function loadParentCategories() {
        try {
            const response = await fetch('/api/categories/top-level?size=100');
            if (response.ok) {
                const data = await response.json();
                const categories = data.content || data;

                parentCategorySelect.innerHTML = '<option value="">Nenhuma (Categoria Raiz)</option>';
                categories.forEach(category => {
                    if (!currentCategoryId || category.id != currentCategoryId) {
                        const option = document.createElement('option');
                        option.value = category.id;
                        option.textContent = category.name;
                        parentCategorySelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading parent categories:', error);
        }
    }

    // === CARREGAR CATEGORIAS COM FILTROS ===
    async function loadCategories(page = 0) {
        showLoading();
        try {
            let url = buildCategoriesUrl(page);
            const response = await fetch(url);

            if (!response.ok) throw new Error('Failed to load categories');

            const data = await response.json();
            renderCategories(data);
            updatePagination(data, page);
            updateDashboardInfo(data);

        } catch (error) {
            console.error('Error loading categories:', error);
            showError('Erro ao carregar categorias');
        } finally {
            hideLoading();
        }
    }

    function buildCategoriesUrl(page) {
        const params = new URLSearchParams({
            page: page,
            size: pageSize,
            sort: currentSort
        });

        if (currentSearch) {
            return `/api/categories/search?name=${encodeURIComponent(currentSearch)}&${params}`;
        }

        if (currentStatusFilter === 'enabled') {
            return `/api/categories/enabled?${params}`;
        }

        if (currentTypeFilter === 'root') {
            return `/api/categories/top-level?${params}`;
        }

        return `/api/categories?${params}`;
    }

    // === RENDERIZAR CATEGORIAS NA TABELA ===
    function renderCategories(data) {
        const categories = data.content || data;
        tableBody.innerHTML = '';

        if (!categories || categories.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" style="text-align: center;">Nenhuma categoria encontrada</td>`;
            tableBody.appendChild(row);
            return;
        }

        categories.forEach(category => {
            const row = document.createElement('tr');
            const hierarchyLevel = category.parentId ? 'subcategory' : 'root-category';

            row.innerHTML = `
                <td>${category.id}</td>
                <td class="${hierarchyLevel}">
                    ${category.parentId ? '<span class="subcategory-indent">↳ Subcategoria de</span> ' : '<span class="root-category-indent">• Categoria Principal</span> '}
                    ${category.name}
                </td>
                <td>
                    <span class="status-badge ${category.enabled ? 'status-active' : 'status-inactive'}">
                        ${category.enabled ? 'Ativa' : 'Inativa'}
                    </span>
                </td>
                <td>
                    ${category.parentId ? 'Subcategoria' : 'Categoria Raiz'}
                </td>
                <td>
                    <button class="btn-action btn-view" data-id="${category.id}" title="Ver detalhes">Detalhes</button>
                    <button class="btn-action btn-edit" data-id="${category.id}" data-name="${category.name}" data-enabled="${category.enabled}" data-parent="${category.parentId}" title="Editar">Editar</button>
                    <button class="btn-action btn-delete" data-id="${category.id}" data-name="${category.name}" title="Excluir">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // === ATUALIZAR INFORMAÇÕES DO DASHBOARD ===
    function updateDashboardInfo(data) {
        const categories = data.content || data;
        totalCategories = data.totalElements || categories.length;
        totalPages = data.totalPages || 1;

        document.getElementById('totalCategories').textContent = totalCategories;
        document.getElementById('currentPageInfo').textContent = `${(data.number || 0) + 1}/${totalPages}`;

        // Calcular estatísticas
        const activeCount = categories.filter(cat => cat.enabled).length;
        const rootCount = categories.filter(cat => !cat.parentId).length;

        document.getElementById('activeCount').textContent = activeCount;

        // Atualizar informações de paginação
        const startItem = ((data.number || 0) * pageSize) + 1;
        const endItem = Math.min(startItem + pageSize - 1, totalCategories);
        document.getElementById('showingStart').textContent = startItem;
        document.getElementById('showingEnd').textContent = endItem;
        document.getElementById('totalItems').textContent = totalCategories;
    }

    // === PAGINAÇÃO ===
    function updatePagination(data, currentPage) {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        if (!data.totalPages || data.totalPages <= 1) return;

        // Botão anterior
        if (!data.first) {
            const prevBtn = createPaginationButton('‹ Anterior', () => loadCategories(currentPage - 1));
            pagination.appendChild(prevBtn);
        }

        // Números de página
        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(data.totalPages - 1, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = createPaginationButton(i + 1, () => loadCategories(i), i === currentPage);
            pagination.appendChild(pageBtn);
        }

        // Botão próximo
        if (!data.last) {
            const nextBtn = createPaginationButton('Próximo ›', () => loadCategories(currentPage + 1));
            pagination.appendChild(nextBtn);
        }
    }

    function createPaginationButton(text, onClick, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `pagination-btn ${isActive ? 'pagination-active' : ''}`;
        button.onclick = onClick;
        return button;
    }

    // === MODAL - ADICIONAR/EDITAR ===
    function openAddModal() {
        modalTitle.textContent = 'Nova Categoria';
        categoryNameInput.value = '';
        categoryEnabledCheckbox.checked = true;
        parentCategorySelect.value = '';
        currentCategoryId = null;

        document.getElementById('nameError').textContent = '';
        modal.classList.remove('hidden');
        categoryNameInput.focus();
    }

    function openEditModal(categoryId, categoryName, enabled, parentId) {
        modalTitle.textContent = 'Editar Categoria';
        categoryNameInput.value = categoryName;
        categoryEnabledCheckbox.checked = enabled;
        parentCategorySelect.value = parentId || '';
        currentCategoryId = categoryId;

        document.getElementById('nameError').textContent = '';
        modal.classList.remove('hidden');
        categoryNameInput.focus();
    }

    function closeModal() {
        modal.classList.add('hidden');
        currentCategoryId = null;
    }

    // === SALVAR CATEGORIA ===
    async function saveCategory() {
        const name = categoryNameInput.value.trim();
        if (!name) {
            showError('Informe um nome para a categoria.', 'nameError');
            return;
        }

        showLoading();
        try {
            const categoryData = {
                name: name,
                enabled: categoryEnabledCheckbox.checked,
                parentId: parentCategorySelect.value ? parseInt(parentCategorySelect.value) : null
            };

            const method = currentCategoryId ? 'PUT' : 'POST';
            const url = currentCategoryId ? `/api/categories/${currentCategoryId}` : '/api/categories';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao salvar categoria');
            }

            closeModal();
            await loadCategories(currentPage);
            showSuccess('Categoria salva com sucesso!');

        } catch (error) {
            console.error('Error saving category:', error);
            showError(error.message, 'nameError');
        } finally {
            hideLoading();
        }
    }

    // === MODAL DE DETALHES ===
    async function showCategoryDetails(categoryId) {
        showLoading();
        try {
            const response = await fetch(`/api/categories/${categoryId}/with-children`);
            if (!response.ok) throw new Error('Failed to load category details');

            const category = await response.json();
            renderCategoryDetails(category);

        } catch (error) {
            console.error('Error loading category details:', error);
            showError('Erro ao carregar detalhes da categoria');
        } finally {
            hideLoading();
        }
    }

    function renderCategoryDetails(category) {
        document.getElementById('detailId').textContent = category.id;
        document.getElementById('detailName').textContent = category.name;
        document.getElementById('detailStatus').textContent = category.enabled ? 'Ativa' : 'Inativa';
        document.getElementById('detailStatus').className = `detail-value ${category.enabled ? 'status-active' : 'status-inactive'}`;
        document.getElementById('detailParent').textContent = category.parentName || 'Nenhuma (Categoria Raiz)';
        document.getElementById('detailHasChildren').textContent = category.children && category.children.length > 0 ? 'Sim' : 'Não';

        // Formatar datas no padrão brasileiro
        const today = new Date();
        const formattedDate = today.toLocaleDateString('pt-BR');
        document.getElementById('detailCreated').textContent = formattedDate;
        document.getElementById('detailUpdated').textContent = formattedDate;

        // Carregar subcategorias se existirem
        if (category.children && category.children.length > 0) {
            renderSubcategories(category.children);
            document.getElementById('subcategoriesSection').style.display = 'block';
        } else {
            document.getElementById('subcategoriesSection').style.display = 'none';
        }

        detailsModal.classList.remove('hidden');
    }

    function renderSubcategories(children) {
        const subcategoriesList = document.getElementById('subcategoriesList');
        subcategoriesList.innerHTML = '';

        children.forEach(child => {
            const subcategoryItem = document.createElement('div');
            subcategoryItem.className = 'subcategory-item';
            subcategoryItem.innerHTML = `
                <span class="subcategory-name">${child.name}</span>
                <span class="subcategory-status ${child.enabled ? 'status-active' : 'status-inactive'}">
                    ${child.enabled ? 'Ativa' : 'Inativa'}
                </span>
            `;
            subcategoriesList.appendChild(subcategoryItem);
        });
    }

    function closeDetailsModal() {
        detailsModal.classList.add('hidden');
    }

    // === EXCLUIR CATEGORIA ===
    async function deleteCategory(categoryId, categoryName) {
        showConfirmModal(
            'Confirmar Exclusão',
            `Tem certeza que deseja excluir a categoria "${categoryName}"?`,
            async () => {
                showLoading();
                try {
                    const response = await fetch(`/api/categories/${categoryId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Erro ao excluir categoria');
                    }

                    await loadCategories(currentPage);
                    showSuccess('Categoria excluída com sucesso!');
                } catch (error) {
                    console.error('Error deleting category:', error);
                    showError(error.message);
                } finally {
                    hideLoading();
                }
            }
        );
    }

    // === FUNÇÕES DE BUSCA E ORDENAÇÃO ===
    function performSearch() {
        currentSearch = searchInput.value.trim();
        currentPage = 0;
        loadCategories(currentPage);
    }

    function toggleSort() {
        if (currentSort === 'name,asc') {
            currentSort = 'name,desc';
            sortBtn.textContent = 'Ordenar A-Z';
        } else if (currentSort === 'name,desc') {
            currentSort = 'id,asc';
            sortBtn.textContent = 'Ordenar ID ↑';
        } else if (currentSort === 'id,asc') {
            currentSort = 'id,desc';
            sortBtn.textContent = 'Ordenar ID ↓';
        } else {
            currentSort = 'name,asc';
            sortBtn.textContent = 'Ordenar Z-A';
        }
        loadCategories(currentPage);
    }

    function handleFilterChange() {
        currentStatusFilter = statusFilter.value;
        currentTypeFilter = typeFilter.value;
        currentPage = 0;
        loadCategories(currentPage);
    }

    function handlePageSizeChange() {
        pageSize = parseInt(itemsPerPageSelect.value);
        currentPage = 0;
        loadCategories(currentPage);
    }

    // === EXPORTAÇÃO ===
    async function exportToCSV() {
        showLoading();
        try {
            const response = await fetch('/api/categories/export');
            if (response.ok) {
                const categories = await response.json();
                generateCSV(categories);
                showSuccess('CSV exportado com sucesso!');
            }
        } catch (error) {
            console.error('Error exporting categories:', error);
            showError('Erro ao exportar categorias');
        } finally {
            hideLoading();
        }
    }

    function generateCSV(categories) {
        const csvContent = [
            'ID,Nome,Status,Categoria Pai',
            ...categories.map(cat =>
                `${cat.id},"${cat.name}",${cat.enabled ? 'Ativa' : 'Inativa'},"${cat.parentName || ''}"`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        link.href = url;
        link.setAttribute('download', `categories_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // === RESET CATEGORIAS ===
    async function resetCategories() {
        showConfirmModal(
            'Reset de Categorias',
            '⚠️ ATENÇÃO: Isso irá resetar todas as categorias para o estado inicial. Esta ação é irreversível! Continuar?',
            async () => {
                showLoading();
                try {
                    const response = await fetch('/api/categories/reset', {
                        method: 'POST'
                    });

                    if (response.ok) {
                        await loadCategories(0);
                        showSuccess('Categorias resetadas com sucesso!');
                    }
                } catch (error) {
                    console.error('Error resetting categories:', error);
                    showError('Erro ao resetar categorias');
                } finally {
                    hideLoading();
                }
            }
        );
    }

    // === MANIPULADOR DE EVENTOS DA TABELA ===
    function handleTableClick(event) {
        const target = event.target;
        const categoryId = target.dataset.id;
        const categoryName = target.dataset.name;

        if (target.classList.contains('btn-view')) {
            showCategoryDetails(categoryId);
        } else if (target.classList.contains('btn-edit')) {
            openEditModal(
                categoryId,
                target.dataset.name,
                target.dataset.enabled === 'true',
                target.dataset.parent
            );
        } else if (target.classList.contains('btn-delete')) {
            deleteCategory(categoryId, categoryName);
        }
    }

    // === MODAL DE CONFIRMAÇÃO ===
    function showConfirmModal(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;

        const confirmModal = document.getElementById('confirmModal');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');

        const cleanUp = () => {
            confirmOk.onclick = null;
            confirmCancel.onclick = null;
            confirmModal.classList.add('hidden');
        };

        confirmOk.onclick = () => {
            onConfirm();
            cleanUp();
        };

        confirmCancel.onclick = cleanUp;
        confirmModal.classList.remove('hidden');
    }

    // === UTILITÁRIOS ===
    function showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    function hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    function showSuccess(message) {
        alert(message); // Em produção, usar um toast notification
    }

    function showError(message, elementId = null) {
        if (elementId) {
            document.getElementById(elementId).textContent = message;
        } else {
            alert('Erro: ' + message); // Em produção, usar um toast notification
        }
    }

    function logout() {
        localStorage.clear();
        window.location.href = '/login';
    }

    // INICIAR APLICAÇÃO
    init();
});