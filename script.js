class AddMeUp {
    constructor() {
        // New dynamic input elements
        this.dynamicInput = document.getElementById('currentInput');
        this.liveItemsDisplay = document.getElementById('liveItemsDisplay');
        this.priceHighlight = document.getElementById('priceHighlight');
        this.lineNumber = document.querySelector('.line-number');
        this.addBtn = document.getElementById('addBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        
        // Control elements
        this.itemsControls = document.getElementById('itemsControls');
        this.selectedCount = document.getElementById('selectedCount');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.indentSelectedBtn = document.getElementById('indentSelectedBtn');
        
        // Receipt elements
        this.receiptItems = document.getElementById('receiptItems');
        this.totalAmount = document.getElementById('totalAmount');
        this.itemCount = document.querySelector('.item-count');
        this.excludedCount = document.getElementById('excludedCount');
        this.excludedAmount = document.getElementById('excludedAmount');
        
        // Legacy elements for compatibility (kept hidden)
        this.textarea = document.getElementById('itemsInput');
        this.previewList = document.getElementById('previewList');
        
        // Data management
        this.items = [];
        this.itemIdCounter = 0;
        this.selectedItems = new Set();
        
        // Drag selection
        this.isDragging = false;
        this.dragStartPoint = null;
        
        // Hover tracking for tab functionality
        this.hoveredCard = null;
        
        // Animation tracking for satisfying total updates
        this.previousTotal = 0;
        this.isAnimatingTotal = false;
        this.currentAnimationFrame = null;
        this.lastAnimationTime = 0;
        
        this.initializeEventListeners();
        this.initializeEmptyState();
        this.loadSampleData();
        
        // Initialize previous total to avoid animating from 0 on first load
        const initialTotals = this.calculateTotals();
        this.previousTotal = initialTotals.included.total;
        
        this.updateDisplay();
    }
    
    initializeEventListeners() {
        // Dynamic input events
        this.dynamicInput.addEventListener('input', (e) => this.handleInputChange(e));
        this.dynamicInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        this.dynamicInput.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Button events
        this.addBtn.addEventListener('click', () => this.addCurrentItem());
        this.pasteBtn.addEventListener('click', () => this.handlePasteClick());
        this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedItems());
        this.indentSelectedBtn.addEventListener('click', () => this.toggleSelectedIndentation());
        
        // Drag selection events (mouse and touch)
        this.liveItemsDisplay.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.liveItemsDisplay.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.liveItemsDisplay.addEventListener('mouseup', () => this.handleMouseUp());
        this.liveItemsDisplay.addEventListener('mouseleave', () => this.handleMouseUp());
        
        // Touch events for trackpad/mobile support
        this.liveItemsDisplay.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.liveItemsDisplay.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.liveItemsDisplay.addEventListener('touchend', () => this.handleMouseUp());
        this.liveItemsDisplay.addEventListener('touchcancel', () => this.handleMouseUp());
        
        // Click outside to deselect
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    }
    
    handleMouseDown(e) {
        const card = e.target.closest('.live-item-card');
        if (!card && !e.target.closest('.item-action-btn')) {
            // Start drag selection on empty space
            this.isDragging = true;
            this.dragStartPoint = { x: e.clientX, y: e.clientY };
            this.liveItemsDisplay.classList.add('dragging');
            e.preventDefault();
            e.stopPropagation();
            document.onselectstart = () => false; // Prevent text selection during drag
        } else if (card && (e.metaKey || e.ctrlKey)) {
            // Cmd/Ctrl+click for multi-select
            e.preventDefault();
            this.toggleItemSelection(card.dataset.itemId);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.dragStartPoint) return;
        
        // More permissive drag selection area
        const minX = Math.min(this.dragStartPoint.x, e.clientX);
        const maxX = Math.max(this.dragStartPoint.x, e.clientX);
        const minY = Math.min(this.dragStartPoint.y, e.clientY);
        const maxY = Math.max(this.dragStartPoint.y, e.clientY);
        
        const cards = this.liveItemsDisplay.querySelectorAll('.live-item-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;
            
            // Check if card center is in drag selection area
            const isInSelection = cardCenterX >= minX && cardCenterX <= maxX && 
                                 cardCenterY >= minY && cardCenterY <= maxY;
            
            const itemId = card.dataset.itemId;
            if (isInSelection && !this.selectedItems.has(itemId)) {
                this.selectItem(itemId);
            }
        });
    }
    
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragStartPoint = null;
            this.liveItemsDisplay.classList.remove('dragging');
            document.onselectstart = null; // Re-enable text selection
        }
    }
    
    handleTouchStart(e) {
        const card = e.target.closest('.live-item-card');
        if (!card && !e.target.closest('.item-action-btn') && e.touches.length === 1) {
            // Start drag selection with single finger touch
            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStartPoint = { x: touch.clientX, y: touch.clientY };
            this.liveItemsDisplay.classList.add('dragging');
            e.preventDefault();
        }
    }
    
    handleTouchMove(e) {
        if (!this.isDragging || !this.dragStartPoint || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        
        // More permissive drag selection area
        const minX = Math.min(this.dragStartPoint.x, touch.clientX);
        const maxX = Math.max(this.dragStartPoint.x, touch.clientX);
        const minY = Math.min(this.dragStartPoint.y, touch.clientY);
        const maxY = Math.max(this.dragStartPoint.y, touch.clientY);
        
        const cards = this.liveItemsDisplay.querySelectorAll('.live-item-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;
            
            // Check if card center is in drag selection area
            const isInSelection = cardCenterX >= minX && cardCenterX <= maxX && 
                                 cardCenterY >= minY && cardCenterY <= maxY;
            
            const itemId = card.dataset.itemId;
            if (isInSelection && !this.selectedItems.has(itemId)) {
                this.selectItem(itemId);
            }
        });
        
        e.preventDefault();
    }
    
    isPointInDragArea(x1, y1, x2, y2, px, py) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }
    
    handleGlobalClick(e) {
        // Deselect all if clicking outside the items area
        if (!e.target.closest('.live-items-display') && 
            !e.target.closest('.items-controls') &&
            !e.target.closest('.dynamic-input')) {
            this.clearSelection();
        }
    }
    
    selectItem(itemId) {
        this.selectedItems.add(itemId);
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            card.classList.add('selected');
        }
        this.updateControlsDisplay();
    }
    
    deselectItem(itemId) {
        this.selectedItems.delete(itemId);
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            card.classList.remove('selected');
        }
        this.updateControlsDisplay();
    }
    
    clearSelection() {
        this.selectedItems.forEach(itemId => {
            const card = document.querySelector(`[data-item-id="${itemId}"]`);
            if (card) {
                card.classList.remove('selected');
            }
        });
        this.selectedItems.clear();
        this.updateControlsDisplay();
    }
    
    updateControlsDisplay() {
        const count = this.selectedItems.size;
        if (count > 0) {
            this.itemsControls.style.display = 'flex';
            this.selectedCount.textContent = `${count} selected`;
        } else {
            this.itemsControls.style.display = 'none';
        }
    }
    
    deleteSelectedItems() {
        if (this.selectedItems.size === 0) return;
        
        const itemsToDelete = Array.from(this.selectedItems);
        itemsToDelete.forEach(itemId => {
            this.removeItem(itemId, false); // Don't update display for each
        });
        
        this.clearSelection();
        this.updateDisplay();
        this.showSuccessMessage(`Deleted ${itemsToDelete.length} items!`);
    }
    
    toggleSelectedIndentation() {
        if (this.selectedItems.size === 0) return;
        
        // Check if any selected items are not excluded
        const hasUnexcluded = Array.from(this.selectedItems).some(itemId => {
            const item = this.items.find(i => i.id == itemId);
            return item && !item.excluded;
        });
        
        // If any are unexcluded, exclude all. Otherwise, include all.
        const shouldExclude = hasUnexcluded;
        
        this.selectedItems.forEach(itemId => {
            this.setItemIndentation(itemId, shouldExclude);
        });
        
        this.updateDisplay();
        this.updateTextarea();
        
        const action = shouldExclude ? 'excluded' : 'included';
        this.showSuccessMessage(`${this.selectedItems.size} items ${action}!`);
    }
    
    handleInputChange(e) {
        const value = e.target.value;
        this.updatePriceHighlight(value);
        
        // Auto-add item when user types and pauses
        clearTimeout(this.inputTimeout);
        if (value.trim() && this.detectPrice(value)) {
            this.inputTimeout = setTimeout(() => {
                if (this.dynamicInput.value === value && value.trim()) {
                    this.addCurrentItem();
                }
            }, 1500);
        }
    }
    
    handleInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.addCurrentItem();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const lastCard = this.liveItemsDisplay.querySelector('.live-item-card:last-child');
            if (lastCard) {
                this.toggleItemIndentation(lastCard.dataset.itemId);
            }
        }
    }
    
    handleGlobalKeydown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (this.hoveredCard) {
                // Tab on hovered card
                this.toggleItemIndentation(this.hoveredCard);
            } else if (this.selectedItems.size > 0) {
                // Tab on selected items
                this.toggleSelectedIndentation();
            }
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedItems.size > 0) {
            e.preventDefault();
            this.deleteSelectedItems();
        }
    }
    
    handlePaste(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        this.processPastedText(pastedText);
    }
    
    handlePasteClick() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                this.processPastedText(text);
            }).catch(err => {
                this.showPasteInstruction();
            });
        } else {
            this.showPasteInstruction();
        }
    }
    
    showPasteInstruction() {
        const tempInput = document.createElement('textarea');
        tempInput.placeholder = 'Paste your items here and press Ctrl+Enter';
        tempInput.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            padding: 1rem;
            border-radius: 12px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            font-size: 1rem;
            width: 400px;
            height: 200px;
            backdrop-filter: blur(20px);
        `;
        
        tempInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                this.processPastedText(tempInput.value);
                document.body.removeChild(tempInput);
            }
        });
        
        document.body.appendChild(tempInput);
        tempInput.focus();
    }
    
    processPastedText(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const addedItems = [];
        
        lines.forEach(line => {
            const isIndented = line.match(/^\s+/);
            const cleanLine = line.trim();
            if (cleanLine) {
                const item = this.parseItemLine(cleanLine);
                if (item) {
                    item.excluded = !!isIndented;
                    this.addItemToList(item);
                    addedItems.push(item);
                }
            }
        });
        
        if (addedItems.length > 0) {
            this.showSuccessMessage(`Added ${addedItems.length} items!`);
        }
        
        this.updateDisplay();
    }
    
    updatePriceHighlight(value) {
        const priceMatch = this.detectPrice(value);
        if (priceMatch) {
            this.priceHighlight.textContent = this.formatCurrency(priceMatch);
            this.priceHighlight.classList.add('visible');
        } else {
            this.priceHighlight.classList.remove('visible');
        }
    }
    
    detectPrice(text) {
        const priceRegex = /\$?(\d+(?:\.\d{2})?)\s*$/;
        const match = text.match(priceRegex);
        return match ? parseFloat(match[1]) : null;
    }
    
    addCurrentItem() {
        const value = this.dynamicInput.value.trim();
        if (!value) return;
        
        const item = this.parseItemLine(value);
        if (item) {
            this.addItemToList(item);
            this.dynamicInput.value = '';
            this.priceHighlight.classList.remove('visible');
            this.updateLineNumber();
            this.updateDisplay();
            
            this.dynamicInput.focus();
            this.showAddedItemFeedback(item);
        }
    }
    
    parseItemLine(line) {
        const priceRegex = /\$?(\d+(?:\.\d{2})?)\s*$/;
        const priceMatch = line.match(priceRegex);
        
        let itemName = line;
        let price = 0;
        
        if (priceMatch) {
            price = parseFloat(priceMatch[1]);
            itemName = line.replace(priceRegex, '').trim();
        }
        
        if (!itemName) return null;
        
        return {
            id: ++this.itemIdCounter,
            name: itemName,
            price: price,
            excluded: false,
            lineIndex: this.items.length
        };
    }
    
    addItemToList(item) {
        this.items.push(item);
        this.createLiveItemCard(item);
        this.updateTextarea();
    }
    
    createLiveItemCard(item) {
        const card = document.createElement('div');
        card.className = `live-item-card ${item.excluded ? 'excluded' : ''} adding`;
        card.dataset.itemId = item.id;
        
        card.innerHTML = `
            <div class="live-item-name">${this.escapeHtml(item.name)}</div>
            <div class="live-item-price">${this.formatCurrency(item.price)}</div>
            <div class="item-actions">
                <div class="item-action-btn" onclick="addMeUpApp.toggleItemIndentation('${item.id}')" title="Toggle exclusion (Tab)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12H21M12 3L12 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="item-action-btn" onclick="addMeUpApp.removeItem('${item.id}')" title="Remove item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
        `;
        
        // Add click handler for selection
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.item-action-btn')) {
                this.toggleItemSelection(item.id);
            }
        });
        
        // Add hover tracking for tab functionality
        card.addEventListener('mouseenter', () => {
            this.hoveredCard = item.id;
            card.classList.add('hovered');
        });
        
        card.addEventListener('mouseleave', () => {
            this.hoveredCard = null;
            card.classList.remove('hovered');
        });
        
        this.liveItemsDisplay.appendChild(card);
        
        setTimeout(() => {
            card.classList.remove('adding');
        }, 500);
    }
    
    toggleItemSelection(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.deselectItem(itemId);
        } else {
            this.selectItem(itemId);
        }
    }
    
    toggleItemIndentation(itemId) {
        const item = this.items.find(i => i.id == itemId);
        if (item) {
            item.excluded = !item.excluded;
            this.updateItemCard(item);
            this.updateDisplay();
            this.updateTextarea();
        }
    }
    
    setItemIndentation(itemId, shouldIndent) {
        const item = this.items.find(i => i.id == itemId);
        if (item && item.excluded !== shouldIndent) {
            item.excluded = shouldIndent;
            this.updateItemCard(item);
            this.updateDisplay();
            this.updateTextarea();
        }
    }
    
    updateItemCard(item) {
        const card = document.querySelector(`[data-item-id="${item.id}"]`);
        if (card) {
            if (item.excluded) {
                card.classList.add('excluded');
            } else {
                card.classList.remove('excluded');
            }
            
            // Smooth transition will handle the state change automatically
        }
    }
    
    removeItem(itemId, updateDisplay = true) {
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => {
                this.items = this.items.filter(item => item.id != itemId);
                this.selectedItems.delete(itemId);
                if (card.parentNode) {
                    card.parentNode.removeChild(card);
                }
                if (updateDisplay) {
                    this.updateDisplay();
                    this.updateTextarea();
                    this.updateEmptyState();
                }
            }, 300);
        }
    }
    
    updateLineNumber() {
        this.lineNumber.textContent = this.items.length + 1;
    }
    
    updateTextarea() {
        const textareaValue = this.items.map(item => {
            const prefix = item.excluded ? '    ' : '';
            return `${prefix}${item.name}${item.price ? ' ' + this.formatCurrency(item.price) : ''}`;
        }).join('\n');
        this.textarea.value = textareaValue;
    }
    
    showAddedItemFeedback(item) {
        const feedback = document.createElement('div');
        feedback.textContent = `✓ Added: ${item.name}`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-weight: 500;
            z-index: 1000;
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => document.body.removeChild(feedback), 300);
        }, 2000);
    }
    
    showSuccessMessage(message) {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(139, 92, 246, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            z-index: 1000;
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => document.body.removeChild(feedback), 300);
        }, 2500);
    }
    
    initializeEmptyState() {
        this.updateEmptyState();
    }
    
    updateEmptyState() {
        const existingEmptyState = this.liveItemsDisplay.querySelector('.empty-input-state');
        
        if (this.items.length === 0) {
            if (!existingEmptyState) {
                this.liveItemsDisplay.innerHTML = `
                    <div class="empty-input-state">
                        <div class="emoji">🛍️</div>
                        <div class="text">Start adding items above</div>
                        <div class="subtext">Type item and price, then press Enter</div>
                    </div>
                `;
            }
        } else {
            // Remove empty state when items exist
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
        }
    }
    
    loadSampleData() {
        const sampleItems = [
            { name: 'iPhone 15 Pro', price: 999, excluded: false },
            { name: 'AirPods Pro', price: 249, excluded: false },
            { name: 'MacBook Air', price: 1299, excluded: false },
            { name: 'Case for iPhone', price: 25, excluded: true },
            { name: 'Screen protector', price: 15, excluded: true },
            { name: 'iPad Pro', price: 799, excluded: false }
        ];
        
        if (this.items.length === 0) {
            
            
            this.updateLineNumber();
            this.updateTextarea();
        }
    }
    
    calculateTotals() {
        const includedItems = this.items.filter(item => !item.excluded);
        const excludedItems = this.items.filter(item => item.excluded);
        
        const includedTotal = includedItems.reduce((sum, item) => sum + item.price, 0);
        const excludedTotal = excludedItems.reduce((sum, item) => sum + item.price, 0);
        
        return {
            included: {
                items: includedItems,
                total: includedTotal,
                count: includedItems.length
            },
            excluded: {
                items: excludedItems,
                total: excludedTotal,
                count: excludedItems.length
            }
        };
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }
    
    // Satisfying counting animation for total changes
    animateTotalChange(fromAmount, toAmount) {
        // If no change, just update directly
        if (fromAmount === toAmount) {
            this.totalAmount.textContent = this.formatCurrency(toAmount);
            return;
        }
        
        // If already animating, interrupt the current animation
        if (this.isAnimatingTotal && this.currentAnimationFrame) {
            cancelAnimationFrame(this.currentAnimationFrame);
            // Clean up current animation state
            this.totalAmount.classList.remove('updating', 'updated');
            this.totalAmount.style.removeProperty('--scale-factor');
            const receiptTotal = this.totalAmount.closest('.receipt-total');
            if (receiptTotal) {
                receiptTotal.classList.remove('updating');
            }
            // Use the previous target as the starting point for the new animation
            fromAmount = this.previousTotal;
        }
        
        this.isAnimatingTotal = true;
        const totalElement = this.totalAmount;
        
        // Store the target amount for potential interruptions
        this.previousTotal = toAmount;
        
        // Adjust duration based on how recent the last animation was (for rapid changes)
        const now = performance.now();
        const timeSinceLastAnimation = now - this.lastAnimationTime;
        let duration;
        
        if (timeSinceLastAnimation < 400) {
            // Rapid successive changes - use shorter duration
            duration = 300;
        } else {
            // Normal duration for isolated changes
            duration = 600;
        }
        
        this.lastAnimationTime = now;
        const startTime = now;
        const difference = toAmount - fromAmount;
        const isIncreasing = difference > 0;
        
        // Calculate dynamic scale based on change amount
        const changeAmount = Math.abs(difference);
        let scaleMultiplier;
        
        if (changeAmount < 25) {
            scaleMultiplier = 1.15;       // Small changes: 15% bigger
        } else if (changeAmount < 100) {
            scaleMultiplier = 1.35;       // Medium changes: 35% bigger  
        } else if (changeAmount < 300) {
            scaleMultiplier = 1.55;       // Large changes: 55% bigger
        } else if (changeAmount < 800) {
            scaleMultiplier = 1.75;       // Very large changes: 75% bigger
        } else {
            scaleMultiplier = 2.0;        // Massive changes: 100% bigger!
        }
        
        // Add satisfying effects with dynamic scaling
        totalElement.classList.add('updating');
        totalElement.style.setProperty('--scale-factor', scaleMultiplier);
        
        // Add glow to the entire receipt total section
        const receiptTotal = totalElement.closest('.receipt-total');
        if (receiptTotal) {
            receiptTotal.classList.add('updating');
            setTimeout(() => receiptTotal.classList.remove('updating'), duration);
        }
        
        // Create floating effect elements for extra satisfaction
        this.createSatisfyingEffects(isIncreasing, Math.abs(difference));
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth animation (easeOutCubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentAmount = fromAmount + (difference * easeProgress);
            totalElement.textContent = this.formatCurrency(currentAmount);
            
            if (progress < 1) {
                this.currentAnimationFrame = requestAnimationFrame(animate);
            } else {
                // Animation complete
                totalElement.textContent = this.formatCurrency(toAmount);
                totalElement.classList.remove('updating');
                this.isAnimatingTotal = false;
                this.currentAnimationFrame = null;
                
                // Add completion effect with maintained scale factor
                totalElement.classList.add('updated');
                setTimeout(() => {
                    totalElement.classList.remove('updated');
                    totalElement.style.removeProperty('--scale-factor');
                }, 600);
                
                // Animation complete - no milestones needed
            }
        };
        
        this.currentAnimationFrame = requestAnimationFrame(animate);
    }
    
    // Create satisfying visual effects during total change
    createSatisfyingEffects(isIncreasing, changeAmount) {
        const totalElement = this.totalAmount;
        const rect = totalElement.getBoundingClientRect();
        
        // Create floating numbers for large changes
        if (changeAmount > 50) {
            const floatingNumber = document.createElement('div');
            floatingNumber.className = 'floating-number';
            floatingNumber.textContent = (isIncreasing ? '+' : '-') + this.formatCurrency(changeAmount);
            floatingNumber.style.cssText = `
                position: fixed;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top - 10}px;
                color: ${isIncreasing ? '#10b981' : '#ef4444'};
                font-weight: 700;
                font-size: 1.2rem;
                z-index: 1000;
                pointer-events: none;
                animation: floatUp 1.5s ease forwards;
            `;
            
            document.body.appendChild(floatingNumber);
            setTimeout(() => document.body.removeChild(floatingNumber), 1500);
        }
        
        // Create particle burst for very satisfying changes
        if (changeAmount > 100) {
            this.createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, isIncreasing);
        }
    }
    
    // Create particle burst effect
    createParticleBurst(centerX, centerY, isIncreasing) {
        const colors = isIncreasing ? 
            ['#10b981', '#34d399', '#6ee7b7'] : 
            ['#8b5cf6', '#a78bfa', '#c4b5fd'];
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 6px;
                height: 6px;
                background: ${colors[i % colors.length]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                animation: particleBurst 1s ease forwards;
                animation-delay: ${i * 0.05}s;
            `;
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 60;
            particle.style.setProperty('--end-x', `${Math.cos(angle) * distance}px`);
            particle.style.setProperty('--end-y', `${Math.sin(angle) * distance}px`);
            
            document.body.appendChild(particle);
            setTimeout(() => document.body.removeChild(particle), 1000);
        }
    }
    
    updateDisplay() {
        const totals = this.calculateTotals();
        
        // Update total amount with satisfying animation
        this.animateTotalChange(this.previousTotal, totals.included.total);
        
        // Update item count
        const itemText = totals.included.count === 1 ? 'item' : 'items';
        this.itemCount.textContent = `${totals.included.count} ${itemText}`;
        
        // Update excluded info
        const excludedText = totals.excluded.count === 1 ? 'item' : 'items';
        this.excludedCount.textContent = `${totals.excluded.count} ${excludedText}`;
        this.excludedAmount.textContent = this.formatCurrency(totals.excluded.total);
        
        // Update receipt items (sorted by price, highest first)
        this.updateReceiptDisplay(totals.included.items);
        
        // Update empty state
        this.updateEmptyState();
        this.updateLineNumber();
        
        // Legacy compatibility - update preview list
        this.updatePreviewList([...totals.included.items, ...totals.excluded.items]);
    }
    
    updateReceiptDisplay(items) {
        if (items.length === 0) {
            this.receiptItems.innerHTML = `
                <div class="receipt-empty-state">
                    <div class="receipt-empty-icon">🛒</div>
                    <div class="receipt-empty-text">No items in cart yet</div>
                </div>
            `;
            return;
        }
        
        // Sort by price (highest first)
        const sortedItems = [...items].sort((a, b) => b.price - a.price);
        
        this.receiptItems.innerHTML = sortedItems.map(item => `
            <div class="receipt-item">
                <div class="receipt-item-name">${this.escapeHtml(item.name)}</div>
                <div class="receipt-item-price">${this.formatCurrency(item.price)}</div>
            </div>
        `).join('');
    }
    
    // Legacy compatibility method
    updatePreviewList(items) {
        if (!this.previewList) return;
        
        if (items.length === 0) {
            this.previewList.innerHTML = `
                <div class="empty-state">
                    Start typing to see your items here...
                </div>
            `;
            return;
        }
        
        const sortedItems = items.sort((a, b) => {
            if (a.excluded && !b.excluded) return 1;
            if (!a.excluded && b.excluded) return -1;
            return a.lineIndex - b.lineIndex;
        });
        
        this.previewList.innerHTML = sortedItems.map(item => `
            <div class="preview-item ${item.excluded ? 'excluded' : ''}">
                <span class="item-name">${this.escapeHtml(item.name)}</span>
                <span class="item-price">${this.formatCurrency(item.price)}</span>
            </div>
        `).join('');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global variable for button onclick handlers
let addMeUpApp;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    addMeUpApp = new AddMeUp();
});

// Additional CSS animations
const additionalCSS = `
@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideOutRight {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100px);
    }
}

.live-item-card.selected {
    border-color: rgba(139, 92, 246, 0.6) !important;
    background: rgba(139, 92, 246, 0.15) !important;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4) !important;
    transform: translateX(0) translateY(-2px) !important;
}

.live-item-card.selected.excluded {
    /* Selected excluded items should still show selection but maintain excluded position */
    transform: translateX(20px) translateY(-2px) !important;
    background: rgba(139, 92, 246, 0.08) !important;
}

.dynamic-input:focus + .price-highlight.visible {
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}

/* Drag selection visual feedback */
.live-items-display.dragging {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    cursor: crosshair;
}

.live-items-display.dragging .live-item-card {
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
}

/* Prevent text selection on the entire container during any interaction */
.live-items-display {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

/* Allow text selection only in input fields */
.live-items-display input,
.live-items-display textarea {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
}

/* Hover state for tab functionality */
.live-item-card.hovered {
    border-color: rgba(139, 92, 246, 0.8) !important;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.3) !important;
    transform: translateX(0) translateY(-1px) !important;
}

.live-item-card.hovered.excluded {
    transform: translateX(20px) translateY(-1px) !important;
}

.live-item-card:hover .live-item-price {
    transform: scale(1.05);
}

/* Satisfying total amount animations */
.total-amount {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.total-amount.updating {
    transform: scale(var(--scale-factor, 1.25));
    text-shadow: 
        0 0 20px rgba(139, 92, 246, 0.8),
        0 0 40px rgba(139, 92, 246, 0.6),
        0 0 60px rgba(139, 92, 246, 0.4);
    color: #ffffff !important;
    animation: dynamicTotalPulse 0.6s ease-in-out;
}

.total-amount.updated {
    animation: totalComplete 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes dynamicTotalPulse {
    0% { 
        transform: scale(1); 
        filter: brightness(1);
    }
    25% { 
        transform: scale(var(--scale-factor, 1.25)); 
        filter: brightness(1.4);
    }
    75% { 
        transform: scale(calc(var(--scale-factor, 1.25) * 0.9)); 
        filter: brightness(1.2);
    }
    100% { 
        transform: scale(1); 
        filter: brightness(1);
    }
}

@keyframes totalComplete {
    0% { 
        transform: scale(1); 
    }
    30% { 
        transform: scale(calc(var(--scale-factor, 1.25) * 0.6));
        text-shadow: 
            0 0 30px rgba(139, 92, 246, 1),
            0 0 50px rgba(139, 92, 246, 0.7);
    }
    70% { 
        transform: scale(1.05);
        text-shadow: 
            0 0 20px rgba(139, 92, 246, 0.8),
            0 0 40px rgba(139, 92, 246, 0.5);
    }
    100% { 
        transform: scale(1);
    }
}

/* Floating number effect */
@keyframes floatUp {
    0% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translateY(-60px) scale(1.2);
    }
}

/* Particle burst effect */
@keyframes particleBurst {
    0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
    }
    50% {
        opacity: 1;
        transform: translate(calc(var(--end-x) * 0.7), calc(var(--end-y) * 0.7)) scale(1.5);
    }
    100% {
        opacity: 0;
        transform: translate(var(--end-x), var(--end-y)) scale(0.5);
    }
}

/* Enhanced glow effect during updates */
.receipt-total.updating {
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
    border-top-color: rgba(139, 92, 246, 0.8) !important;
    animation: receiptGlow 0.8s ease-in-out;
}

@keyframes receiptGlow {
    0%, 100% {
        box-shadow: none;
    }
    50% {
        box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
    }
}

/* Milestone animations removed for performance */
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);