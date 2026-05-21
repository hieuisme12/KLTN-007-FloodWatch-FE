import type { HTMLAttributes } from "react";
import { CloudIllustration } from "./cloud";
import { BoxIllustration } from "./box";

const types = {
    box: BoxIllustration,
    cloud: CloudIllustration,
} as const;

export interface IllustrationProps extends HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg";
    svgClassName?: string;
    childrenClassName?: string;
}

export const Illustration = (props: IllustrationProps & { type: keyof typeof types }) => {
    const { type, ...rest } = props;
    const Component = types[type];
    return <Component {...rest} />;
};
