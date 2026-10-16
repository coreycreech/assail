import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
@Component({selector:'app-about-page',standalone:true,imports:[CommonModule],styles:['.managed-about-copy{white-space:pre-wrap}'],template:`
    
    <section class="page-banner">
      <div class="container">
        <h1>About Us</h1>
        <p>Assail Health Care provides progressive, and affordable healthcare, accessible on mobile and online for everyone.</p>
      </div>
    </section>

    
    <section class="about-story">
      <div class="container container--narrow">
        <h2>About Us</h2>
<p *ngIf="information(); else suppliedStory" class="managed-about-copy">{{information()}}</p><ng-template #suppliedStory>

        <p>Assail Health Care is a distinguished healthcare provider specializing in personalized, high-quality care for individuals and families. With a steadfast focus on expert medical services, tailored support, and a seamless patient experience, we are dedicated to enhancing the well being of our clients and fostering a healthier community.</p>

        <p>Our team of compassionate and highly skilled professionals offers an extensive range of healthcare services catering to diverse medical needs. We believe in the power of collaboration and are committed to working closely with our clients, understanding their unique needs, and creating customized care plans to optimize their health outcomes.</p>

        <p>At Assail Health Care, we continuously strive for innovation, embracing cutting-edge technology and advanced treatment methods to deliver the most effective care possible. Our state-of-the-art facilities provide a comfortable and welcoming environment where patients can feel at ease, knowing they are receiving the best possible care.</p>

        <p>We are guided by our unwavering commitment to promoting healthier, happier lives for those we serve. Our mission is not only to address immediate health concerns but also to educate and empower our clients, encouraging them to adopt proactive measures that contribute to their long-term well-being.</p>

        <p>As a trusted partner in health, Assail Health Care is dedicated to making a positive impact on the lives of our clients, one individual and one family at a time. Together, we are building a vibrant and thriving community where health and happiness are within everyone's reach.</p>

        </ng-template><figure class="testimonial">
          <blockquote>
            <p>“Assail Health Care's personalized care and compassionate team have greatly improved our family's well-being. Their commitment to expert care sets them apart as an exceptional healthcare provider.</p>
          </blockquote>
          <figcaption>Angela Smith</figcaption>
        </figure>
      </div>
    </section>

    
    <section class="mission">
      <div class="container container--narrow mission-inner">
        <div class="mission-copy">
          <h2>Our Mission</h2>
          <p>Assail Health Care is dedicated to empowering individuals and families by providing personalized, high-quality, and accessible health care services. We strive to enhance the wellbeing of our clients through expert care, innovative solutions, and a compassionate approach, fostering a healthier, happier community.</p>
        </div>

        <div class="mission-art">
          
          <img src="/assail-calendar-doctor.jpg" alt="Healthcare professional wearing a stethoscope" width="440" height="420">
        </div>
      </div>
    </section>
  `})
export class AboutPageComponent implements OnInit {
  information=signal('');
  constructor(private api:ApiService) {}
  ngOnInit(){this.api.pages().subscribe({next:pages=>{const page=pages.find(p=>['about','about us'].includes(p.name.trim().toLowerCase()));if(page?.information?.trim())this.information.set(page.information);},error:()=>{}});}
}
