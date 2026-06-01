import { NavBarOptionsType } from '@definition/app';
import { navBarOptionsState } from '@states/app';
import { useSetAtom } from 'jotai';
import { useLayoutEffect } from 'react';

const PageTitle = (props: NavBarOptionsType) => {
  const setNavBarOptions = useSetAtom(navBarOptionsState);

  useLayoutEffect(() => {
    setNavBarOptions(props);
    return () => {
      setNavBarOptions({});
    };
  }, [props, setNavBarOptions]);

  return null;
};

export default PageTitle;
