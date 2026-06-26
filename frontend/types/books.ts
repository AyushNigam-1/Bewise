export interface ContentKey {
    name: string;
    steps_count: string;
}

export interface ContentValue {
    step_id: number;
    step: string;
}

export interface BookContentResponse {
    keys: ContentKey[];
    values: ContentValue[];
}

export interface StepDetail {
    step_id: number;
    book_name: string;
    title: string;
    detailed_breakdown: string;
}