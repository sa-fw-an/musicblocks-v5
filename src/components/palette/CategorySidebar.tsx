import React from 'react';
import { CATEGORY_COLORS } from '@/core/ui/constants';
import { globalRegistry } from '@/main-registry';

interface CategorySidebarProps {
    activeCategory: string;
    onSelect: (category: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ activeCategory, onSelect }) => {
    const categories = globalRegistry.getCategories();

    return (
        <div className="palette-category-sidebar">
            {categories.map((cat) => {
                const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? '#C4C4C4';
                const isActive = cat === activeCategory;
                return (
                    <button
                        key={cat}
                        className={`palette-category-btn${isActive ? ' palette-category-btn--active' : ''}`}
                        onClick={() => onSelect(cat)}
                        title={cat}
                    >
                        <div
                            className="palette-category-btn__dot"
                            style={{ background: color }}
                        />
                        <span className="palette-category-btn__label">{cat}</span>
                    </button>
                );
            })}
        </div>
    );
};
