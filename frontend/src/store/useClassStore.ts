import { create } from 'zustand';
import {
    createSectionRecord,
    createStudentRecord,
    createTeacherRecord,
    deleteSectionRecord,
    deleteStudentRecord,
    deleteTeacherRecord,
    fetchSchoolData,
} from '../services/schoolData';
import type { IClassCategory, ISection, IStudent, ITeacher } from '../types/school';
export type { IClassCategory, ISection, IStudent, ITeacher } from '../types/school';

export interface IClassState {
    categories: IClassCategory[];
    sections: ISection[];
    teachers: ITeacher[];
    students: IStudent[];
    inCharges: Record<string, any[]>;
    isLoading: boolean;
    initialized: boolean;
    initialize: () => Promise<void>;
    reset: () => void;
    refresh: () => Promise<void>;

    // CRUD Actions
    addTeacher: (teacher: Omit<ITeacher, 'id'>) => Promise<void>;
    deleteTeacher: (id: string) => Promise<void>;

    addSection: (section: Omit<ISection, 'id'>) => Promise<void>;
    deleteSection: (id: string) => Promise<void>;

    addStudent: (student: Omit<IStudent, 'id'>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
}

export const useClassStore = create<IClassState>()(
    (set, get) => ({
        categories: [],
        sections: [],
        teachers: [],
        students: [],
        inCharges: {},
        isLoading: false,
        initialized: false,
        initialize: async () => {
            if (get().initialized || get().isLoading) {
                return;
            }

            set({ isLoading: true });

            try {
                const data = await fetchSchoolData();
                set({
                    ...data,
                    inCharges: {},
                    isLoading: false,
                    initialized: true,
                });
            } catch (error) {
                console.error('Failed to load school data:', error);
                set({ isLoading: false });
            }
        },
        reset: () => {
            set({
                categories: [],
                sections: [],
                teachers: [],
                students: [],
                inCharges: {},
                isLoading: false,
                initialized: false,
            });
        },
        refresh: async () => {
            if (get().isLoading) {
                return;
            }

            set({
                categories: [],
                sections: [],
                teachers: [],
                students: [],
                inCharges: {},
                initialized: false,
                isLoading: true,
            });

            try {
                const data = await fetchSchoolData();
                set({
                    ...data,
                    inCharges: {},
                    isLoading: false,
                    initialized: true,
                });
            } catch (error) {
                console.error('Failed to refresh school data:', error);
                set({ isLoading: false });
            }
        },

        addTeacher: async (teacher) => {
            const createdTeacher = await createTeacherRecord(teacher);
            set((state) => ({ teachers: [createdTeacher, ...state.teachers] }));
        },
        deleteTeacher: async (id) => {
            await deleteTeacherRecord(id);
            set((state) => ({ teachers: state.teachers.filter((teacher) => teacher.id !== id) }));
        },

        addSection: async (section) => {
            const createdSection = await createSectionRecord(section);
            set((state) => ({ sections: [...state.sections, createdSection] }));
        },
        deleteSection: async (id) => {
            await deleteSectionRecord(id);
            set((state) => ({ sections: state.sections.filter((section) => section.id !== id) }));
        },

        addStudent: async (student) => {
            const createdStudent = await createStudentRecord(student);
            set((state) => ({ students: [...state.students, createdStudent] }));
        },
        deleteStudent: async (id) => {
            await deleteStudentRecord(id);
            set((state) => ({ students: state.students.filter((student) => student.id !== id) }));
        },
    })
);
