import React from 'react';
import { AutoComplete } from 'primereact/autocomplete';

/**
 * PrimeReact AutoComplete — gợi ý theo `completeMethod`, mặc định `appendTo="self"` để panel đi theo layout.
 */
const SearchAutoComplete = React.forwardRef(function SearchAutoComplete(
  {
    appendTo = 'self',
    delay = 300,
    className = '',
    completeOnFocus: _completeOnFocus,
    ...rest
  },
  ref
) {
  return (
    <AutoComplete
      ref={ref}
      appendTo={appendTo}
      delay={delay}
      className={['search-autocomplete-root', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
});

export default SearchAutoComplete;
