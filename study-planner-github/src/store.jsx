import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { planApi, subjectApi } from './api.js';

const DataContext = createContext(null);

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ user, children }) {
  const [subjects, setSubjects] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subjectResult, planResult] = await Promise.all([subjectApi.list(), planApi.list()]);
      setSubjects(subjectResult.subjects);
      setPlans(planResult.plans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const addPlans = useCallback(async (items) => {
    const result = await planApi.create(items);
    setPlans((prev) => [...result.plans, ...prev]);
    return result.plans;
  }, []);

  const updatePlan = useCallback(async (id, patch) => {
    const result = await planApi.update(id, patch);
    setPlans((prev) => prev.map((plan) => (plan.id === id ? result.plan : plan)));
    return result.plan;
  }, []);

  const setPlanStatus = useCallback(async (id, status) => {
    await planApi.patchStatus(id, status);
    setPlans((prev) => prev.map((plan) => (plan.id === id ? { ...plan, status } : plan)));
  }, []);

  const deletePlan = useCallback(async (id) => {
    await planApi.remove(id);
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
  }, []);

  const addSubject = useCallback(async (payload) => {
    const result = await subjectApi.create(payload);
    setSubjects((prev) => [...prev, result.subject]);
    return result.subject;
  }, []);

  const updateSubject = useCallback(async (id, payload) => {
    const result = await subjectApi.update(id, payload);
    setSubjects((prev) => prev.map((s) => (s.id === id ? result.subject : s)));
    setPlans((prev) =>
      prev.map((plan) =>
        plan.subject_id === id
          ? { ...plan, subject_name: result.subject.name, subject_color: result.subject.color }
          : plan,
      ),
    );
    return result.subject;
  }, []);

  const deleteSubject = useCallback(async (id) => {
    await subjectApi.remove(id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setPlans((prev) =>
      prev.map((plan) =>
        plan.subject_id === id
          ? { ...plan, subject_id: null, subject_name: '', subject_color: null }
          : plan,
      ),
    );
  }, []);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const value = {
    user,
    subjects,
    plans,
    subjectMap,
    loading,
    error,
    refresh,
    addPlans,
    updatePlan,
    setPlanStatus,
    deletePlan,
    addSubject,
    updateSubject,
    deleteSubject,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
