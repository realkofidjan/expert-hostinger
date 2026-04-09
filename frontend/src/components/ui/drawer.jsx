'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '@/lib/utils';

function Drawer({
	...props
}) {
	return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
	...props
}) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
	...props
}) {
	return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
	...props
}) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
	className,
	...props
}) {
	return (
		<DrawerPrimitive.Overlay
			data-slot="drawer-overlay"
			className={cn(
				'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-black/50 fixed inset-0 z-50 backdrop-blur-sm',
				className,
			)}
			{...props}
		/>
	);
}

function DrawerContent({
	className,
	children,
	...props
}) {
	return (
		<DrawerPortal data-slot="drawer-portal">
			<DrawerOverlay />
			<DrawerPrimitive.Content
				data-slot="drawer-content"
				className={cn(
					'group/drawer-content bg-white dark:bg-gray-950 fixed z-50 flex h-auto flex-col',
					'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-3xl data-[vaul-drawer-direction=top]:border-b',
					'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-3xl data-[vaul-drawer-direction=bottom]:border-t',
					'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-md data-[vaul-drawer-direction=right]:border-l shadow-2xl transition-transform duration-500',
					'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-full data-[vaul-drawer-direction=left]:max-w-sm data-[vaul-drawer-direction=left]:border-r',
					className,
				)}
				{...props}
			>
				<div className="bg-gray-200 dark:bg-gray-800 mx-auto my-2 hidden h-1.5 w-12 shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />

				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
	);
}

function DrawerHeader({ className, ...props }) {
	return (
		<div
			data-slot="drawer-header"
			className={cn(
				'flex w-full flex-col gap-1 border-b border-gray-100 dark:border-gray-800 px-6 py-5',
				className,
			)}
			{...props}
		/>
	);
}

function DrawerBody({ className, ...props }) {
	return (
		<div
			data-slot="drawer-body"
			className={cn('w-full px-6 py-6 overflow-y-auto flex-1', className)}
			{...props}
		/>
	);
}

function DrawerFooter({ className, ...props }) {
	return (
		<div
			data-slot="drawer-footer"
			className={cn(
				'mt-auto grid w-full gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-5',
				className,
			)}
			{...props}
		/>
	);
}

function DrawerTitle({
	className,
	...props
}) {
	return (
		<DrawerPrimitive.Title
			data-slot="drawer-title"
			className={cn('text-gray-900 dark:text-white font-black text-lg', className)}
			{...props}
		/>
	);
}

function DrawerDescription({
	className,
	...props
}) {
	return (
		<DrawerPrimitive.Description
			data-slot="drawer-description"
			className={cn('text-gray-500 dark:text-gray-400 text-xs font-medium', className)}
			{...props}
		/>
	);
}

export {
	Drawer,
	DrawerPortal,
	DrawerOverlay,
	DrawerTrigger,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerBody,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
};
