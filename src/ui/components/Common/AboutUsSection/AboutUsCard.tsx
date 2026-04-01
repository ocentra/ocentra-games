import './AboutUsCard.css';

export interface AboutUsCardProps {
  icon?: string;
  title: string;
  description: string;
}

export function AboutUsCard({ icon, title, description }: AboutUsCardProps) {
  return (
    <div className="about-us-card">
      {/* Quote Icon */}
      <div className="about-us-card-quote">"</div>
      
      {/* Left Section - Icon + Title */}
      <div className="about-us-card-left">
        {icon && (
          <div className="about-us-card-icon-container">
            <div className="about-us-card-icon">{icon}</div>
          </div>
        )}
        <h3 className="about-us-card-title">{title}</h3>
      </div>
      
      {/* Right Section - Description */}
      <div className="about-us-card-right">
        <p className="about-us-card-description">{description}</p>
      </div>
    </div>
  );
}

