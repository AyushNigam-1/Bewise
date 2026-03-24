export interface Recommendation {
    insight_id: number;
    title: string;
    category: string;
    category_icon: string;
    description: string;
}

export type User = {
    id: number;
    name: string;
    email: string;
    favourite_books: number[]
    favourite_insights: number[]
};

export type Categories = {
    name: string,
    icon: string,
    description: string,
}
export type Book = {
    author: string,
    category: string,
    description: string,
    id: number,
    thumbnail: string,
    title: string
}

export interface StepData {
    icon: string;
    step_id: number;
    book_name: string;
    category: string;
    title: string;
    description: string;
    detailed_breakdown: string;
    step: string
}

export interface BookData {
    id: number;
    title: string;
    author: string;
    thumbnail: string;
    description: string;
    category: string | string[];
}

export interface BookInfo {
    id: number;
    title: string;
    author: string;
    thumbnail: string;
    sub_categories_count: number;
    total_insights: number;
    categories: string;
}

export type QuizQuestion = {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
};

export type QuizModalProps = {
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
    textData: string;
};

export interface CardProps {
    book: Book;
    isBookmarked: boolean | undefined
}

export type ChatInputProps = {
    book?: string;
    loading: boolean;
    contextItems: ContextItem[];
    selectedContexts: ContextItem[];
    toggleContext: (item: ContextItem) => void;
    removeContext: (id: string | number) => void;
    onSendMessage: (message: string) => void;
    clearContexts: () => void;
    onStop: () => void; // 🌟 Add this
};

export type Insight = {
    id: number;
    title: string;
    book: string;
    category: string;
    category_icon: string;
    description: string;
    link: string;
};

export type Message = {
    role: "user" | "ai";
    content?: string;
    insights?: Insight[];
};

export type ContextItem = {
    id: string | number;
    name: string;
};

export type ChatbotModalProps = {
    book?: string;
    contextItems?: ContextItem[];
};

export type ShareModalProps = { isOpen: boolean, setIsOpen: (open: boolean) => void, shareUrl: string }

export interface CategoryProps {
    filteredCategories: any[],
    setFilteredCategories: React.Dispatch<React.SetStateAction<any[]>>
    categories: any[],
    toggleCategory: (category: any) => void,
    selectedCategory: any[]
}

export interface ExploreHeaderProps<T> {
    title: string;
    items: T[];
    filteredItems: T[];
    setFilteredItems: React.Dispatch<React.SetStateAction<T[]>>;
    searchKey: keyof T;
    categories: Categories[];
    filteredCategories: Categories[];
    setFilteredCategories: React.Dispatch<React.SetStateAction<Categories[]>>;
    selectedCategory: Categories[];
    toggleCategory: (category: Categories) => void;
    getItemId: (item: T) => number | string;
    getItemLabel: (item: T) => string;
    setMode?: React.Dispatch<React.SetStateAction<string>>
    mode?: string
}

export type SearchBarProps = {
    responsive: boolean;
    data: any[];
    propertyToSearch: keyof any;
    setFilteredData: React.Dispatch<React.SetStateAction<any[]>>;
}

export type SliderProps = { steps: any[], title: string }