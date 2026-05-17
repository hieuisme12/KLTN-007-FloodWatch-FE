import {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  type RefAttributes,
  createContext,
  isValidElement,
  useContext
} from 'react';
import {
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  type ToggleButtonGroupProps,
  type ToggleButtonProps
} from 'react-aria-components';
import { cn } from '@/lib/cn';
import { isReactComponent } from '@/utils/is-react-component';

type ButtonSize = 'sm' | 'md' | 'lg';

const ButtonGroupContext = createContext<{ size: ButtonSize }>({ size: 'md' });

interface ButtonGroupItemProps extends ToggleButtonProps, RefAttributes<HTMLButtonElement> {
  iconLeading?: FC<{ className?: string }> | ReactNode;
  iconTrailing?: FC<{ className?: string }> | ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ButtonGroupItem = ({
  iconLeading: IconLeading,
  iconTrailing: IconTrailing,
  children,
  className,
  ...otherProps
}: PropsWithChildren<ButtonGroupItemProps>) => {
  const { size } = useContext(ButtonGroupContext);

  return (
    <AriaToggleButton
      {...otherProps}
      data-icon-leading={IconLeading ? true : undefined}
      className={cn('uui-btn-group__item', `uui-btn-group__item--${size}`, className)}
    >
      {isReactComponent(IconLeading) && <IconLeading className="uui-btn-group__icon" aria-hidden />}
      {isValidElement(IconLeading) && IconLeading}
      {children ? <span className="uui-btn-group__label">{children}</span> : null}
      {isReactComponent(IconTrailing) && <IconTrailing className="uui-btn-group__icon" aria-hidden />}
      {isValidElement(IconTrailing) && IconTrailing}
    </AriaToggleButton>
  );
};

interface ButtonGroupProps extends Omit<ToggleButtonGroupProps, 'orientation'>, RefAttributes<HTMLDivElement> {
  size?: ButtonSize;
  className?: string;
}

export const ButtonGroup = ({ children, size = 'md', className, ...otherProps }: ButtonGroupProps) => {
  return (
    <ButtonGroupContext.Provider value={{ size }}>
      <AriaToggleButtonGroup selectionMode="single" className={cn('uui-btn-group', className)} {...otherProps}>
        {children}
      </AriaToggleButtonGroup>
    </ButtonGroupContext.Provider>
  );
};
