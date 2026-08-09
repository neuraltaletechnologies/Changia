type AvatarTestimonialSectionProps = {
  src: string;
  alt: string;
};

export default function AvatarTestimonialSection({
  src,
  alt,
}: AvatarTestimonialSectionProps) {
  return (
    <div className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="size-8 rounded-full sm:h-[2.875rem] sm:w-[2.875rem]"
        src={src}
        alt={alt}
        loading="lazy"
      />
    </div>
  );
}
