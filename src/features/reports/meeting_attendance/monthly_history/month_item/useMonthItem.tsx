import { useEffect, useState } from 'react';
import useSharedHook from '../../useSharedHook';

const useMonthItem = (value: string) => {
  const { meetings } = useSharedHook();

  const [expanded, setExpanded] = useState(false);

  const handleToggleExpanded = () => setExpanded((prev) => !prev);

  useEffect(() => {
    // mes NATURAL de hoy, coherente con el registro mensual
    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');

    const monthValue = `${year}/${month}`;

    setExpanded(value === monthValue);
  }, [value]);

  return { expanded, handleToggleExpanded, meetings };
};

export default useMonthItem;
