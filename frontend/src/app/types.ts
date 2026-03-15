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