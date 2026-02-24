import React, { useState } from 'react';
import { CategorySidebar } from './CategorySidebar';
import { BlockListPanel } from './BlockListPanel';
import { globalRegistry } from '@/main-registry';

export const Palette: React.FC = () => {
    const categories = globalRegistry.getCategories();
    const [activeCategory, setActiveCategory] = useState<string>(categories[0] ?? 'rhythm');

    return (
        <>
            <CategorySidebar activeCategory={activeCategory} onSelect={setActiveCategory} />
            <BlockListPanel activeCategory={activeCategory} />
        </>
    );
};
